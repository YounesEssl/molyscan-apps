import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from './crm.crypto';
import { formatCrmDateTime } from './crm-datetime';

interface CrmLoginResponse {
  idToken: string;
  expiresIn: number;
  user?: { id?: string; firstName?: string; lastName?: string; email?: string };
}

export interface CrmCompany {
  id: string;
  name: string;
}

export interface CrmContact {
  id: string;
  companyId: string | null;
  companyName?: string | null;
  name: string;
}

export interface CrmOption {
  value: string;
  label: string;
}

export interface CrmCommunicationOptions {
  actions: CrmOption[];
  objectives: CrmOption[];
  actionsAvailable: boolean;
  objectivesAvailable: boolean;
}

export interface CrmCommunicationRecord {
  companyId: string;
  contactId?: string | null;
  contactName?: string | null;
  subject: string;
  note: string;
  datetime: Date;
  endDatetime?: Date;
  actionCode?: string;
  objectiveCode?: string;
  objectiveCodes?: string[];
}

export interface CrmCommunicationSelection {
  crmActionCode?: string;
  crmActionLabel?: string;
  crmObjectiveCode?: string;
  crmObjectiveLabel?: string;
  crmObjectiveCodes: string[];
  crmObjectiveLabels: string[];
}

// Marge de sécurité : on rafraîchit le token un peu avant son expiration réelle.
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const CRM_REQUEST_TIMEOUT_MS = 30_000;
// La liste des sociétés change peu et l'appel CRM est lent (~14s pour 17k).
// Au-delà de ce délai, on rafraîchit EN ARRIÈRE-PLAN sans faire attendre l'appelant.
const COMPANY_FRESH_MS = 30 * 60_000;
const PERSON_FRESH_MS = 30 * 60_000;

@Injectable()
export class CrmService implements OnModuleInit {
  private readonly logger = new Logger(CrmService.name);
  private readonly baseUrl: string;
  private readonly encryptionKey: string;
  private readonly companyCache = new Map<string, { at: number; data: CrmCompany[] }>();
  private readonly companyRefreshing = new Set<string>();
  private readonly personCache = new Map<string, { at: number; data: CrmContact[] }>();
  private readonly personRefreshing = new Set<string>();
  private readonly personRefreshPromises = new Map<string, Promise<CrmContact[]>>();
  private readonly optionsCache = new Map<string, { at: number; data: CrmCommunicationOptions }>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('CRM_BASE_URL').replace(/\/+$/, '');
    this.encryptionKey = this.config.getOrThrow<string>('CRM_ENCRYPTION_KEY');
  }

  /**
   * Au démarrage, préchauffe le cache sociétés (en arrière-plan) pour chaque
   * commercial ayant des identifiants CRM. Le 1er fetch CRM est lent : on l'absorbe
   * ici plutôt que de faire attendre l'utilisateur à l'ouverture du sélecteur.
   */
  async onModuleInit(): Promise<void> {
    try {
      const creds = await this.prisma.crmCredential.findMany({ select: { userId: true } });
      for (const { userId } of creds) {
        void this.getCompanies(userId).catch((e) =>
          this.logger.warn(`Startup company warm-up failed for ${userId}: ${e}`),
        );
        void this.getPersons(userId).catch((e) =>
          this.logger.warn(`Startup contact warm-up failed for ${userId}: ${e}`),
        );
      }
      if (creds.length) {
        this.logger.log(`Warming CRM company cache for ${creds.length} user(s)`);
      }
    } catch (e) {
      this.logger.warn(`CRM warm-up on init failed: ${e}`);
    }
  }

  // ── Identifiants par commercial ─────────────────────────────────

  /** Enregistre les identifiants CRM d'un commercial après les avoir validés. */
  async saveCredentials(userId: string, login: string, password: string) {
    const session = await this.login(login, password); // 401 si invalides

    const passwordEnc = encryptSecret(password, this.encryptionKey);
    const tokenExpiresAt = new Date(Date.now() + session.expiresIn * 1000);
    const crmUserId = session.user?.id != null ? String(session.user.id) : null;

    await this.prisma.crmCredential.upsert({
      where: { userId },
      create: { userId, login, passwordEnc, crmUserId, idToken: session.idToken, tokenExpiresAt },
      update: { login, passwordEnc, crmUserId, idToken: session.idToken, tokenExpiresAt },
    });
    this.optionsCache.delete(userId);

    // Préchauffe le cache sociétés en arrière-plan (le 1er fetch CRM est lent).
    this.getCompanies(userId).catch((e) =>
      this.logger.warn(`Company cache warm-up failed: ${e}`),
    );
    this.getPersons(userId).catch((e) =>
      this.logger.warn(`Contact cache warm-up failed: ${e}`),
    );

    return { configured: true, crmUser: session.user ?? null };
  }

  async getStatus(userId: string) {
    const cred = await this.prisma.crmCredential.findUnique({ where: { userId } });
    return { configured: !!cred, login: cred?.login ?? null };
  }

  async deleteCredentials(userId: string) {
    await this.prisma.crmCredential.deleteMany({ where: { userId } });
    this.companyCache.delete(userId);
    this.companyRefreshing.delete(userId);
    this.personCache.delete(userId);
    this.personRefreshing.delete(userId);
    this.personRefreshPromises.delete(userId);
    this.optionsCache.delete(userId);
    return { configured: false };
  }

  /** Values and labels come from the CRM reference lists, never from observed notes. */
  async getCommunicationOptions(userId: string): Promise<CrmCommunicationOptions> {
    const cred = await this.prisma.crmCredential.findUnique({ where: { userId }, select: { id: true } });
    if (!cred) throw new BadRequestException('CRM credentials not configured for this user');
    const cached = this.optionsCache.get(userId);
    if (cached && Date.now() - cached.at < 5 * 60_000) return cached.data;

    const actionOverride = Boolean(this.config.get<string>('CRM_ACTION_OPTIONS_PATH'));
    const objectiveOverride = Boolean(this.config.get<string>('CRM_OBJECTIVE_OPTIONS_PATH'));
    const [native, customActions, customObjectives] = await Promise.all([
      !actionOverride || !objectiveOverride ? this.loadNativeCommunicationOptions(userId) : null,
      actionOverride ? this.loadReferenceOptions(userId, 'ACTION') : null,
      objectiveOverride ? this.loadReferenceOptions(userId, 'OBJECTIVE') : null,
    ]);
    const actions = actionOverride ? customActions : native?.actions ?? null;
    const objectives = objectiveOverride ? customObjectives : native?.objectives ?? null;
    const data = {
      actions: actions ?? [], objectives: objectives ?? [],
      actionsAvailable: actions !== null,
      objectivesAvailable: objectives !== null,
    };
    // An unavailable reference is retried, so fixing CRM settings takes effect immediately.
    if (data.actionsAvailable && data.objectivesAvailable) {
      this.optionsCache.set(userId, { at: Date.now(), data });
    }
    return data;
  }

  private async loadNativeCommunicationOptions(userId: string) {
    try {
      // ICyPWA uses this single authenticated request for both picklists.
      const raw = await this.authedRequest(userId, 'GET', '/api/AppStruct');
      const translations = (raw as { offline?: { translations?: unknown } } | null)?.offline?.translations;
      if (!Array.isArray(translations)) throw new Error('Expected AppStruct offline.translations');
      return {
        actions: this.nativePicklist(translations, 'comm_action'),
        objectives: this.nativePicklist(translations, 'comm_liste_objectifs'),
      };
    } catch (error) {
      this.logger.warn(`CRM communication references unavailable: ${error}`);
      return { actions: null, objectives: null };
    }
  }

  private nativePicklist(translations: unknown[], family: string): CrmOption[] | null {
    const rows = translations.filter((row): row is Record<string, unknown> =>
      row !== null && typeof row === 'object' && !Array.isArray(row)
      && (row as Record<string, unknown>).type === 'choices'
      && (row as Record<string, unknown>).family === family);
    if (!rows.length) return null;
    const options = new Map<string, CrmOption>();
    for (const row of rows) {
      if (typeof row.code !== 'string' || !row.code.trim()
        || typeof row.capt !== 'string' || !row.capt.trim()
        || (options.has(row.code) && options.get(row.code)!.label !== row.capt)) {
        this.logger.warn(`CRM ${family} picklist has an invalid code or caption`);
        return null;
      }
      options.set(row.code, { value: row.code, label: row.capt });
    }
    // Match ICyPWA getPicklist(): retain the AppStruct sequence and its localized
    // captions, without sorting or deriving choices from existing communications.
    return [...options.values()];
  }

  private async loadReferenceOptions(userId: string, kind: 'ACTION' | 'OBJECTIVE'): Promise<CrmOption[] | null> {
    const path = this.config.get<string>(`CRM_${kind}_OPTIONS_PATH`);
    const valueField = this.config.get<string>(`CRM_${kind}_VALUE_FIELD`);
    const labelField = this.config.get<string>(`CRM_${kind}_LABEL_FIELD`);
    // Explicit overrides retain their own code/caption mapping. An incomplete
    // override is unavailable rather than silently falling back to another source.
    if (!path || !valueField || !labelField) return null;
    if (!/^\/api\/[A-Za-z0-9_/?=&.%-]+$/.test(path)) {
      this.logger.warn(`Invalid CRM ${kind} reference endpoint`);
      return null;
    }
    try {
      const raw = await this.authedRequest(userId, 'GET', path);
      if (!Array.isArray(raw) && !Array.isArray((raw as any)?.records) && !Array.isArray((raw as any)?.data)) {
        throw new Error('Expected a CRM reference list');
      }
      const options = new Map<string, CrmOption>();
      for (const row of this.extractList(raw)) {
        const value = row[valueField];
        const label = row[labelField];
        if ((typeof value !== 'string' && typeof value !== 'number') || typeof label !== 'string' || !label.trim()) {
          throw new Error('CRM reference mapping does not match the response');
        }
        options.set(String(value), { value: String(value), label: label.trim() });
      }
      return [...options.values()];
    } catch (error) {
      this.logger.warn(`CRM ${kind} reference unavailable: ${error}`);
      return null;
    }
  }

  private normalizeObjectiveCodes(objectives?: string[] | string): string[] {
    const values = typeof objectives === 'string' ? [objectives] : objectives ?? [];
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  async validateCommunicationSelection(
    userId: string,
    actionCode?: string,
    objectives?: string[] | string,
  ): Promise<CrmCommunicationSelection> {
    const objectiveCodes = this.normalizeObjectiveCodes(objectives);
    if (!actionCode && !objectiveCodes.length) return { crmObjectiveCodes: [], crmObjectiveLabels: [] };
    const options = await this.getCommunicationOptions(userId);
    const action = actionCode ? options.actions.find((item) => item.value === actionCode) : undefined;
    const selectedObjectives = objectiveCodes.map((code) => options.objectives.find((item) => item.value === code));
    if ((actionCode && !options.actionsAvailable) || (objectiveCodes.length && !options.objectivesAvailable)) {
      throw new ServiceUnavailableException('CRM reference lists unavailable. Please try again.');
    }
    if ((actionCode && !action) || selectedObjectives.some((objective) => !objective)) {
      throw new BadRequestException('The selected CRM action or objective is no longer available');
    }
    const objectiveLabels = selectedObjectives.map((objective) => objective!.label);
    return {
      ...(action && { crmActionCode: action.value, crmActionLabel: action.label }),
      ...(objectiveCodes.length && { crmObjectiveCode: objectiveCodes[0], crmObjectiveLabel: objectiveLabels[0] }),
      crmObjectiveCodes: objectiveCodes,
      crmObjectiveLabels: objectiveLabels,
    };
  }

  // ── Données CRM ─────────────────────────────────────────────────

  /**
   * Liste des sociétés du CRM, réduite à { id, name } et mise en cache.
   * Le CRM renvoie ~17k sociétés / ~29 Mo : on ne transmet au mobile que
   * l'essentiel pour éviter un transfert et un parsing massifs côté téléphone.
   */
  async getCompanies(userId: string): Promise<CrmCompany[]> {
    const cred = await this.prisma.crmCredential.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cred) {
      this.companyCache.delete(userId);
      this.companyRefreshing.delete(userId);
      this.personCache.delete(userId);
      this.personRefreshing.delete(userId);
      this.personRefreshPromises.delete(userId);
      throw new BadRequestException('CRM credentials not configured for this user');
    }

    const cached = this.companyCache.get(userId);
    if (cached) {
      // Stale-while-revalidate : on répond tout de suite avec le cache, et on
      // rafraîchit en arrière-plan s'il commence à dater. Zéro attente pour l'appelant.
      if (Date.now() - cached.at >= COMPANY_FRESH_MS) {
        void this.refreshCompanies(userId).catch((e) =>
          this.logger.warn(`Background company refresh failed: ${e}`),
        );
      }
      return cached.data;
    }
    // Pas encore de cache : premier chargement (lent, inévitable).
    return this.refreshCompanies(userId);
  }

  /** Récupère la liste depuis le CRM et met à jour le cache (dédupliqué). */
  private async refreshCompanies(userId: string): Promise<CrmCompany[]> {
    if (this.companyRefreshing.has(userId)) {
      // Un rafraîchissement est déjà en cours : on renvoie le cache actuel s'il existe.
      const current = this.companyCache.get(userId);
      if (current) return current.data;
    }
    this.companyRefreshing.add(userId);
    try {
      const raw = await this.authedRequest(userId, 'GET', '/api/Data/company/list');
      const list = this.extractList(raw)
        .map((r) => this.normalizeCompany(r))
        .filter((c): c is CrmCompany => c !== null);
      this.companyCache.set(userId, { at: Date.now(), data: list });
      return list;
    } finally {
      this.companyRefreshing.delete(userId);
    }
  }

  /**
   * Recherche paginée côté serveur sur la liste (cachée) des sociétés.
   * Évite d'envoyer les ~17k sociétés au mobile : on ne renvoie que les
   * premiers résultats correspondant à la requête.
   */
  async searchCompanies(
    userId: string,
    query: string,
    limit = 50,
  ): Promise<{ items: CrmCompany[]; total: number }> {
    const all = await this.getCompanies(userId);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter((c) => c.name.toLowerCase().includes(q))
      : all;
    return { items: filtered.slice(0, limit), total: filtered.length };
  }

  private extractList(payload: any): Record<string, any>[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.records)) return payload.records;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  private normalizeCompany(raw: Record<string, any>): CrmCompany | null {
    const id = raw.comp_companyid ?? raw.company_companyid ?? raw.companyid ?? raw.id;
    const name = raw.comp_name ?? raw.company_name ?? raw.name ?? '';
    if (id == null) return null;
    return { id: String(id), name: String(name || id) };
  }

  async searchContacts(
    userId: string,
    companyId: string,
    query: string,
    limit = 50,
  ): Promise<{ items: CrmContact[]; total: number }> {
    const all = await this.getPersons(userId);
    const q = query.trim().toLowerCase();
    const companyPersons = companyId
      ? all.filter((p) => p.companyId === companyId)
      : all;

    let companyNameById = new Map<string, string>();
    if (!companyId && q) {
      try {
        const companies = await this.getCompanies(userId);
        companyNameById = new Map(
          companies.map((company) => [company.id, company.name.toLowerCase()]),
        );
      } catch (error) {
        this.logger.warn(`CRM company lookup for global contact search failed: ${error}`);
      }
    }

    const filtered = q
      ? companyPersons.filter((p) => {
          const companyName = p.companyId ? companyNameById.get(p.companyId) : null;
          return p.name.toLowerCase().includes(q) || Boolean(companyName?.includes(q));
        })
      : companyPersons;

    const items = await this.enrichContactsWithCompanyNames(
      userId,
      filtered.slice(0, limit),
    );
    return { items, total: filtered.length };
  }

  private async enrichContactsWithCompanyNames(
    userId: string,
    contacts: CrmContact[],
  ): Promise<CrmContact[]> {
    if (!contacts.some((contact) => contact.companyId)) return contacts;

    try {
      const companies = await this.getCompanies(userId);
      const byId = new Map(companies.map((company) => [company.id, company.name]));
      return contacts.map((contact) => ({
        ...contact,
        companyName: contact.companyId ? byId.get(contact.companyId) ?? null : null,
      }));
    } catch (error) {
      this.logger.warn(`CRM contact company enrichment failed: ${error}`);
      return contacts;
    }
  }

  private async getPersons(userId: string): Promise<CrmContact[]> {
    const cached = this.personCache.get(userId);
    if (cached) {
      if (Date.now() - cached.at >= PERSON_FRESH_MS) {
        void this.refreshPersons(userId).catch((e) =>
          this.logger.warn(`Background person refresh failed: ${e}`),
        );
      }
      return cached.data;
    }
    return this.refreshPersons(userId);
  }

  private async refreshPersons(userId: string): Promise<CrmContact[]> {
    const inFlight = this.personRefreshPromises.get(userId);
    if (inFlight) return inFlight;

    if (this.personRefreshing.has(userId)) {
      const current = this.personCache.get(userId);
      if (current) return current.data;
    }

    this.personRefreshing.add(userId);

    const refresh = (async () => {
      const raw = await this.authedRequest(userId, 'GET', '/api/Data/person/list');
      const list = this.extractList(raw)
        .map((r) => this.normalizePerson(r))
        .filter((p): p is CrmContact => p !== null);
      this.personCache.set(userId, { at: Date.now(), data: list });
      return list;
    })();

    this.personRefreshPromises.set(userId, refresh);

    try {
      return await refresh;
    } finally {
      this.personRefreshing.delete(userId);
      this.personRefreshPromises.delete(userId);
    }
  }

  private normalizePerson(raw: Record<string, any>): CrmContact | null {
    const id =
      raw.pers_personid ??
      raw.person_personid ??
      raw.personid ??
      raw.id;
    const companyId =
      raw.pers_companyid ??
      raw.person_companyid ??
      raw.company_companyid ??
      raw.comp_companyid ??
      raw.companyid ??
      null;
    const firstName = raw.pers_firstname ?? raw.person_firstname ?? raw.firstname ?? '';
    const lastName = raw.pers_lastname ?? raw.person_lastname ?? raw.lastname ?? '';
    const name =
      raw.pers_fullname ??
      raw.person_fullname ??
      raw.fullname ??
      raw.name ??
      `${firstName} ${lastName}`.trim();

    if (id == null) return null;
    return {
      id: String(id),
      companyId: companyId == null ? null : String(companyId),
      name: String(name || id),
    };
  }

  private async resolvePersonId(
    userId: string,
    companyId: string,
    contactName?: string,
    contactId?: string | null,
  ): Promise<string | null> {
    if (contactId) return contactId;

    const needle = contactName?.trim().toLowerCase();
    if (!needle) return null;

    try {
      const persons = await this.getPersons(userId);
      const companyPersons = persons.filter((p) => p.companyId === companyId);
      const exact = companyPersons.find((p) => p.name.toLowerCase() === needle);
      if (exact) return exact.id;

      const partial = companyPersons.find((p) => p.name.toLowerCase().includes(needle));
      if (partial) return partial.id;

      this.logger.warn(
        `CRM contact not found for company ${companyId}: "${contactName}"`,
      );
      return null;
    } catch (error) {
      this.logger.warn(`CRM contact lookup failed: ${error}`);
      return null;
    }
  }

  /**
   * Crée une communication (note vocale) dans le CRM.
   * Renvoie la liste des ids créés. On génère nous-mêmes le guid (clé primaire).
   */
  async createCommunication(
    userId: string,
    record: CrmCommunicationRecord,
    communicationId?: string,
  ): Promise<{ id: string; createdIds: unknown }> {
    const cred = await this.prisma.crmCredential.findUnique({ where: { userId } });
    // The caller persists this identifier before sending so an uncertain outcome
    // can be reconciled without creating a second communication.
    const id = communicationId ?? randomUUID();
    const fields = await this.communicationFields(userId, id, record);
    const personId = await this.resolvePersonId(
      userId,
      record.companyId,
      record.contactName ?? undefined,
      record.contactId,
    );
    const payload = [
      {
        ...fields,
        ...(personId && { comm_personid: personId }),
        // Propriétaire = utilisateur CRM connecté, sinon la communication
        // n'apparaît dans aucune vue commerciale.
        ...(cred?.crmUserId && { comm_userids: cred.crmUserId }),
      },
    ];

    const createdIds = await this.authedRequest(
      userId,
      'POST',
      '/api/Data/communication',
      payload,
    );
    // The documented create response is a list of created GUIDs. A 2xx status
    // alone (including proxy HTML or a malformed body) cannot confirm this write.
    if (!Array.isArray(createdIds) || createdIds.length !== 1
      || typeof createdIds[0] !== 'string' || createdIds[0].toLowerCase() !== id.toLowerCase()) {
      throw new ServiceUnavailableException('CRM did not confirm creation of the reserved communication');
    }

    if (personId) {
      await this.linkCommunicationToPerson(
        userId,
        id,
        record.companyId,
        personId,
        cred?.crmUserId ?? null,
      );
    }

    return { id, createdIds };
  }

  canUpdateCommunication(): boolean {
    return true;
  }

  async updateCommunication(
    userId: string,
    communicationId: string,
    record: CrmCommunicationRecord,
  ): Promise<{ id: string; updatedIds: unknown }> {
    const payload = await this.communicationFields(userId, communicationId, record);
    // Real CRM validation requires an object for PUT; only creation uses an array.
    // Innovation's confirmed update route retains the existing communication.
    // Its owner/contact relations are deliberately absent from this payload.
    const updatedIds = await this.authedRequest(userId, 'PUT',
      `/api/Data/communication/${encodeURIComponent(communicationId)}`, payload);
    const acknowledgement = updatedIds && typeof updatedIds === 'object' && !Array.isArray(updatedIds)
      ? updatedIds as Record<string, unknown> : null;
    const hasError = ['error', 'Error', 'errors', 'Errors'].some((field) => {
      const value = acknowledgement?.[field];
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') return Object.keys(value).length > 0;
      return Boolean(value);
    });
    if (updatedIds === false || acknowledgement?.success === false || acknowledgement?.Success === false || hasError) {
      throw new ServiceUnavailableException('CRM rejected the communication update');
    }
    return { id: communicationId, updatedIds };
  }

  private async communicationFields(userId: string, id: string, record: CrmCommunicationRecord) {
    if (record.endDatetime && record.endDatetime <= record.datetime) {
      throw new BadRequestException('Appointment end must be after its start');
    }
    const selected = await this.validateCommunicationSelection(userId, record.actionCode,
      record.objectiveCodes ?? record.objectiveCode);
    return {
      comm_communicationid: id,
      comm_subject: (record.subject || 'Note vocale').slice(0, 255),
      comm_companyid: record.companyId,
      comm_note: record.note ?? '',
      comm_type: 'vocal',
      comm_action: record.actionCode || 'vocal',
      comm_status: 'complete',
      comm_datetime: this.formatDateTime(record.datetime),
      comm_todatetime: this.formatDateTime(record.endDatetime ?? record.datetime),
      // Match the AppStruct field name exactly: the CRM silently ignores
      // "Comm_liste_objectifs" despite returning HTTP 200.
      // An explicit empty array clears earlier selections on an update.
      comm_liste_objectifs: selected.crmObjectiveCodes,
    };
  }

  async communicationExists(userId: string, communicationId: string): Promise<boolean | null> {
    try {
      const token = await this.getToken(userId);
      let res = await this.fetchCrm(
        'GET',
        `/api/Data/communication/${encodeURIComponent(communicationId)}`,
        token,
      );

      if (res.status === 401) {
        const refreshedToken = await this.getToken(userId, true);
        res = await this.fetchCrm(
          'GET',
          `/api/Data/communication/${encodeURIComponent(communicationId)}`,
          refreshedToken,
        );
      }

      if (res.ok) return true;

      const text = await res.text().catch(() => '');
      if (res.status === 400 || res.status === 404) {
        // A missing route, proxy HTML page or generic 404 is not proof that the
        // record is absent. Only an error naming this identifier permits a retry.
        const html = /text\/html/i.test(res.headers.get('content-type') ?? '') || /^\s*</.test(text);
        const namesRecord = text.toLowerCase().includes(communicationId.toLowerCase());
        const missingRecord = /\b(?:unknown\s+(?:communication|record)|(?:communication|record)\s+(?:not[\s_-]*found|unknown)|(?:communication|enregistrement)\s+(?:inconnue?|introuvable))\b/i.test(text);
        if (!html && namesRecord && missingRecord) return false;
      }

      this.logger.warn(
        `CRM communication lookup failed for ${communicationId}: ${res.status} ${text}`,
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `CRM communication lookup unreachable for ${communicationId}: ${error}`,
      );
      return null;
    }
  }

  private async linkCommunicationToPerson(
    userId: string,
    communicationId: string,
    companyId: string,
    personId: string,
    crmUserId: string | null,
  ): Promise<void> {
    const payload = [
      {
        cmli_comm_communicationid: communicationId,
        cmli_comm_companyid: companyId,
        cmli_comm_personid: personId,
        ...(crmUserId && { cmli_comm_userid: crmUserId }),
      },
    ];

    try {
      await this.authedRequest(userId, 'POST', '/api/Data/comm_link', payload);
    } catch (error) {
      this.logger.warn(
        `CRM comm_link failed for communication ${communicationId} / person ${personId}: ${error}`,
      );
    }
  }

  // ── Internes ────────────────────────────────────────────────────

  /** Appel authentifié avec un re-login automatique en cas de 401. */
  private async authedRequest(
    userId: string,
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    let token = await this.getToken(userId);
    let res = await this.fetchCrm(method, path, token, body);

    if (res.status === 401) {
      token = await this.getToken(userId, true); // force le refresh
      res = await this.fetchCrm(method, path, token, body);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`CRM ${method} ${path} → ${res.status} ${text}`);
      throw new ServiceUnavailableException('CRM request failed');
    }

    try {
      // Successful updates may return 204 or an empty 200. Read the body before
      // parsing so an interrupted or malformed nonempty reply never becomes success.
      const text = await res.text();
      if (/text\/html/i.test(res.headers.get('content-type') ?? '') || /^\s*</.test(text)) {
        throw new Error('Unexpected HTML response');
      }
      if (!text.trim()) return null;
      return JSON.parse(text);
    } catch {
      throw new ServiceUnavailableException('CRM response could not be confirmed');
    }
  }

  /** Renvoie un Bearer valide pour ce user, depuis le cache ou via re-login. */
  private async getToken(userId: string, force = false): Promise<string> {
    const cred = await this.prisma.crmCredential.findUnique({ where: { userId } });
    if (!cred) {
      throw new BadRequestException('CRM credentials not configured for this user');
    }

    const stillValid =
      cred.idToken &&
      cred.tokenExpiresAt &&
      cred.tokenExpiresAt.getTime() - TOKEN_REFRESH_MARGIN_MS > Date.now();

    if (!force && stillValid) return cred.idToken!;

    const password = decryptSecret(cred.passwordEnc, this.encryptionKey);
    const session = await this.login(cred.login, password);
    await this.prisma.crmCredential.update({
      where: { userId },
      data: {
        idToken: session.idToken,
        tokenExpiresAt: new Date(Date.now() + session.expiresIn * 1000),
        ...(session.user?.id != null && { crmUserId: String(session.user.id) }),
      },
    });
    return session.idToken;
  }

  private async login(login: string, password: string): Promise<CrmLoginResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/Connection/Login/`, {
        method: 'POST',
        signal: AbortSignal.timeout(CRM_REQUEST_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Login: login, Password: password }),
      });
    } catch (err) {
      this.logger.error(`CRM login network error: ${err}`);
      throw new ServiceUnavailableException('CRM unreachable');
    }

    if (!res.ok) {
      // L'API renvoie 500 "InvalidLogin" (identifiant inconnu) ou
      // "InvalidPassword" (mot de passe erroné) sur identifiants invalides.
      const text = await res.text().catch(() => '');
      this.logger.warn(
        `CRM login rejected for "${login}": ${res.status} ${text}`,
      );
      if (
        res.status === 401 ||
        /invalidlogin|invalidpassword/i.test(text)
      ) {
        throw new UnauthorizedException('Invalid CRM credentials');
      }
      throw new ServiceUnavailableException('CRM login failed');
    }

    const data = (await res.json().catch(() => {
      throw new ServiceUnavailableException('CRM login response failed');
    })) as CrmLoginResponse;
    if (!data?.idToken) {
      throw new ServiceUnavailableException('CRM login returned no token');
    }
    return data;
  }

  private async fetchCrm(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    token: string,
    body?: unknown,
  ): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        signal: AbortSignal.timeout(CRM_REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      this.logger.error(`CRM ${method} ${path} network error: ${err}`);
      throw new ServiceUnavailableException('CRM unreachable');
    }
  }

  /** CRM timezone is explicit: never inherit the VPS operating system timezone. */
  formatDateTime(date: Date): string {
    return formatCrmDateTime(date, this.config.get<string>('CRM_TIME_ZONE', 'Europe/Paris'));
  }
}
