import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrmService } from './crm.service';

describe('CRM communication dates and reference lists', () => {
  const base = {
    CRM_BASE_URL: 'https://crm.example.test', CRM_ENCRYPTION_KEY: 'test', CRM_TIME_ZONE: 'Europe/Paris',
    CRM_ACTION_OPTIONS_PATH: '/api/reference/actions', CRM_ACTION_VALUE_FIELD: 'code', CRM_ACTION_LABEL_FIELD: 'caption',
    CRM_OBJECTIVE_OPTIONS_PATH: '/api/reference/objectives', CRM_OBJECTIVE_VALUE_FIELD: 'id', CRM_OBJECTIVE_LABEL_FIELD: 'label',
  };
  let service: CrmService;
  let request: jest.SpyInstance;

  beforeEach(() => {
    service = new CrmService({ crmCredential: { findUnique: jest.fn().mockResolvedValue({ id: 'credential', crmUserId: 'owner' }) } } as any, new ConfigService(base));
    request = jest.spyOn(service as any, 'authedRequest').mockImplementation(async (_user, _method, path, body) => {
      if (path === base.CRM_ACTION_OPTIONS_PATH) return { records: [{ code: 'visit', caption: 'Visite client' }] };
      if (path === base.CRM_OBJECTIVE_OPTIONS_PATH) return [
        { id: 7, label: 'Présentation technique' }, { id: 8, label: 'Essai produit' },
      ];
      if (path === '/api/Data/communication') return [(body as any[])[0].comm_communicationid];
      return ['communication'];
    });
  });

  it.each([
    ['2026-01-16T09:30:00.000Z', '2026-01-16 10:30:00'],
    ['2026-07-16T08:30:00.000Z', '2026-07-16 10:30:00'],
    ['2026-03-29T00:30:00.000Z', '2026-03-29 01:30:00'],
    ['2026-03-29T01:30:00.000Z', '2026-03-29 03:30:00'],
    ['2026-10-25T01:30:00.000Z', '2026-10-25 02:30:00'],
    ['2026-09-15T22:00:00.000Z', '2026-09-16 00:00:00'],
  ])('formats %s in the CRM timezone, including DST and midnight', (iso, expected) => {
    expect(service.formatDateTime(new Date(iso))).toBe(expected);
  });

  it('pushes the chosen CRM codes and a distinct end date while retaining the owner', async () => {
    await service.createCommunication('user', {
      companyId: 'company', subject: 'Compte rendu', note: 'Texte complet',
      datetime: new Date('2026-09-16T08:30:00Z'), endDatetime: new Date('2026-09-16T09:45:00Z'),
      actionCode: 'visit', objectiveCode: '7',
    });
    expect(request).toHaveBeenCalledWith('user', 'POST', '/api/Data/communication', [expect.objectContaining({
      comm_userids: 'owner', comm_action: 'visit', comm_liste_objectifs: ['7'],
      comm_datetime: '2026-09-16 10:30:00', comm_todatetime: '2026-09-16 11:45:00',
    })]);
  });

  it('uses the communication GUID reserved by the caller for the record and its contact link', async () => {
    const reservedId = '4c99f7a3-6af1-4c6c-8e5c-bf4f916419ee';
    jest.spyOn(service as any, 'resolvePersonId').mockResolvedValue('person');
    const result = await service.createCommunication('user', {
      companyId: 'company', contactId: 'person', subject: 'Compte rendu', note: 'Texte', datetime: new Date(),
    }, reservedId);
    expect(result.id).toBe(reservedId);
    expect(request).toHaveBeenCalledWith('user', 'POST', '/api/Data/communication', [expect.objectContaining({
      comm_communicationid: reservedId,
    })]);
    expect(request).toHaveBeenCalledWith('user', 'POST', '/api/Data/comm_link', [expect.objectContaining({
      cmli_comm_communicationid: reservedId,
    })]);
  });

  it('updates the existing communication using the real API object body without changing owner or contact', async () => {
    const resolvePerson = jest.spyOn(service as any, 'resolvePersonId');
    expect(service.canUpdateCommunication()).toBe(true);
    const result = await service.updateCommunication('user', 'existing-id', {
      companyId: 'company', contactId: 'person', contactName: 'Contact',
      subject: 'Changed', note: 'Changed text',
      datetime: new Date('2026-09-16T08:30:00Z'), endDatetime: new Date('2026-09-16T09:45:00Z'),
      actionCode: 'visit', objectiveCodes: ['7', '8'],
    });
    expect(result.id).toBe('existing-id');
    expect(request).toHaveBeenCalledWith('user', 'PUT', '/api/Data/communication/existing-id', {
      comm_communicationid: 'existing-id', comm_subject: 'Changed', comm_companyid: 'company',
      comm_note: 'Changed text', comm_type: 'vocal', comm_action: 'visit', comm_status: 'complete',
      comm_datetime: '2026-09-16 10:30:00', comm_todatetime: '2026-09-16 11:45:00',
      comm_liste_objectifs: ['7', '8'],
    });
    expect(request.mock.calls.some((call) => call[1] === 'POST')).toBe(false);
    expect(resolvePerson).not.toHaveBeenCalled();
  });

  it('validates every selected objective and returns matching ordered labels', async () => {
    expect(await service.validateCommunicationSelection('user', 'visit', ['8', '7', '8'])).toEqual({
      crmActionCode: 'visit', crmActionLabel: 'Visite client',
      crmObjectiveCode: '8', crmObjectiveLabel: 'Essai produit',
      crmObjectiveCodes: ['8', '7'], crmObjectiveLabels: ['Essai produit', 'Présentation technique'],
    });
  });

  it('rejects one unknown objective without sending the otherwise valid update', async () => {
    await expect(service.updateCommunication('user', 'existing-id', {
      companyId: 'company', subject: 'Note', note: '', datetime: new Date(), objectiveCodes: ['7', 'unknown'],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(request.mock.calls.some((call) => call[1] === 'PUT' || call[1] === 'POST')).toBe(false);
  });

  it('sends an explicit empty objective array to clear earlier values, overriding the legacy field', async () => {
    await service.updateCommunication('user', 'existing-id', {
      companyId: 'company', subject: 'Note', note: '', datetime: new Date(), objectiveCodes: [], objectiveCode: '7',
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('user', 'PUT', '/api/Data/communication/existing-id', expect.objectContaining({
      comm_liste_objectifs: [],
    }));
  });

  it.each([
    null, '<html>Sign in</html>', {}, [], ['another-id'], { createdIds: ['reserved-id'] },
    ['reserved-id', 'another-id'],
  ].map((response) => [response]))('does not confirm a creation from an invalid successful response %j', async (response) => {
    request.mockResolvedValue(response);
    jest.spyOn(service as any, 'resolvePersonId').mockResolvedValue('person');
    await expect(service.createCommunication('user', {
      companyId: 'company', contactId: 'person', subject: 'Note', note: 'Texte', datetime: new Date(),
    }, 'reserved-id')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][2]).toBe('/api/Data/communication');
  });

  it('rejects unknown codes before sending a communication', async () => {
    await expect(service.createCommunication('user', {
      companyId: 'company', subject: 'note', note: '', datetime: new Date(), actionCode: 'invented',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(request.mock.calls.some((call) => call[1] === 'POST')).toBe(false);
  });

  it('does not invent options when the native references are unavailable', async () => {
    service = new CrmService({ crmCredential: { findUnique: jest.fn().mockResolvedValue({ id: 'credential' }) } } as any,
      new ConfigService({ CRM_BASE_URL: base.CRM_BASE_URL, CRM_ENCRYPTION_KEY: base.CRM_ENCRYPTION_KEY }));
    jest.spyOn(service as any, 'authedRequest').mockRejectedValue(new ServiceUnavailableException());
    expect(await service.getCommunicationOptions('user')).toEqual({ actions: [], objectives: [], actionsAvailable: false, objectivesAvailable: false });
    await expect(service.validateCommunicationSelection('user', 'visit')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.validateCommunicationSelection('user', undefined, ['7'])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('treats invalid CRM response mapping as unavailable, not as an empty valid list', async () => {
    request.mockResolvedValue([{ unexpected: 'value' }]);
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actionsAvailable: false, objectivesAvailable: false });
  });

  it('rejects end before start before any CRM write', async () => {
    await expect(service.createCommunication('user', {
      companyId: 'company', subject: 'note', note: '',
      datetime: new Date('2026-09-16T10:00:00Z'), endDatetime: new Date('2026-09-16T09:00:00Z'),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('ICy AppStruct communication references', () => {
  const settings = { CRM_BASE_URL: 'https://crm.example.test', CRM_ENCRYPTION_KEY: 'test' };
  const fixture = () => ({
    sysParams: { metadataVersion: 'test' },
    offline: {
      translations: [
        { type: 'tags', family: 'comm_action', code: 'heading', capt: 'Action' },
        { type: 'choices', family: 'comm_action', code: 'meeting', capt: 'Visite', order: 9, bindingsValue: ['appointment'] },
        { type: 'choices', family: 'comm_action', code: 'phoneout', capt: 'Appel sortant', order: 1, bindingsValue: ['phone'] },
        { type: 'choices', family: 'comm_liste_objectifs', code: 'négociation/relanceoffre', capt: 'Négociation / relance offre', order: 2 },
        { type: 'choices', family: 'comm_liste_objectifs', code: 'présentation', capt: 'Présentation technique', order: 1 },
        { type: 'choices', family: 'Comm_liste_objectifs', code: 'wrong-family-case', capt: 'Ignored' },
        { type: 'choices', family: 'users', code: 'not-a-communication-choice', capt: 'Ignored' },
      ],
    },
  });
  let service: CrmService;
  let request: jest.SpyInstance;
  let credential: jest.Mock;

  beforeEach(() => {
    credential = jest.fn().mockResolvedValue({ id: 'credential' });
    service = new CrmService({ crmCredential: { findUnique: credential } } as any, new ConfigService(settings));
    request = jest.spyOn(service as any, 'authedRequest').mockResolvedValue(fixture());
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads both exact families in one GET, preserving the frontend sequence, codes and localized captions', async () => {
    expect(await service.getCommunicationOptions('user')).toEqual({
      actions: [{ value: 'meeting', label: 'Visite' }, { value: 'phoneout', label: 'Appel sortant' }],
      objectives: [
        { value: 'négociation/relanceoffre', label: 'Négociation / relance offre' },
        { value: 'présentation', label: 'Présentation technique' },
      ],
      actionsAvailable: true, objectivesAvailable: true,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('user', 'GET', '/api/AppStruct');
  });

  it('validates accented and slash-containing objective codes without rewriting them', async () => {
    expect(await service.validateCommunicationSelection('user', 'meeting', ['négociation/relanceoffre', 'présentation'])).toMatchObject({
      crmActionCode: 'meeting', crmActionLabel: 'Visite',
      crmObjectiveCodes: ['négociation/relanceoffre', 'présentation'],
      crmObjectiveLabels: ['Négociation / relance offre', 'Présentation technique'],
    });
  });

  it('caches the complete references for five minutes and then reloads them', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await service.getCommunicationOptions('user');
    now.mockReturnValue(1_299_999);
    await service.getCommunicationOptions('user');
    expect(request).toHaveBeenCalledTimes(1);
    const updated = fixture();
    updated.offline.translations[1].capt = 'Visite client';
    request.mockResolvedValue(updated);
    now.mockReturnValue(1_300_000);
    expect((await service.getCommunicationOptions('user')).actions[0].label).toBe('Visite client');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps the references isolated by CRM user', async () => {
    request.mockImplementation(async (user) => {
      const data = fixture();
      data.offline.translations[1].capt = `Visite ${user}`;
      return data;
    });
    expect((await service.getCommunicationOptions('alice')).actions[0].label).toBe('Visite alice');
    expect((await service.getCommunicationOptions('bob')).actions[0].label).toBe('Visite bob');
    expect((await service.getCommunicationOptions('alice')).actions[0].label).toBe('Visite alice');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not serve cached references after credentials have been removed', async () => {
    await service.getCommunicationOptions('user');
    credential.mockResolvedValue(null);
    await expect(service.getCommunicationOptions('user')).rejects.toBeInstanceOf(BadRequestException);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries an unavailable AppStruct immediately instead of caching a fabricated empty list', async () => {
    request.mockRejectedValueOnce(new ServiceUnavailableException()).mockResolvedValue(fixture());
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actionsAvailable: false, objectivesAvailable: false });
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actionsAvailable: true, objectivesAvailable: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([null, {}, { offline: {} }, { offline: { translations: {} } }, { offline: { translations: [] } }]
    .map((body) => [body]))('treats a missing or malformed native payload as unavailable: %j', async (body) => {
    request.mockResolvedValue(body);
    expect(await service.getCommunicationOptions('user')).toEqual({
      actions: [], objectives: [], actionsAvailable: false, objectivesAvailable: false,
    });
  });

  it('marks only an absent family unavailable and does not cache the incomplete pair', async () => {
    const partial = fixture();
    partial.offline.translations = partial.offline.translations.filter((row) => row.family !== 'comm_liste_objectifs');
    request.mockResolvedValueOnce(partial).mockResolvedValue(fixture());
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actionsAvailable: true, objectives: [], objectivesAvailable: false });
    expect(await service.getCommunicationOptions('user')).toMatchObject({ objectivesAvailable: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([{ code: 12 }, { code: '' }, { capt: null }, { capt: ' ' }])('rejects an incomplete family mapping: %j', async (badFields) => {
    const data = fixture();
    Object.assign(data.offline.translations[1], badFields);
    request.mockResolvedValue(data);
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actions: [], actionsAvailable: false, objectivesAvailable: true });
  });

  it('does not choose between conflicting captions for the same code', async () => {
    const data = fixture();
    data.offline.translations.push({ ...data.offline.translations[1], capt: 'Conflicting label' });
    request.mockResolvedValue(data);
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actions: [], actionsAvailable: false });
  });

  it('supports an explicit action override while loading objectives from the single native request', async () => {
    service = new CrmService({ crmCredential: { findUnique: credential } } as any, new ConfigService({
      ...settings, CRM_ACTION_OPTIONS_PATH: '/api/custom/actions', CRM_ACTION_VALUE_FIELD: 'id', CRM_ACTION_LABEL_FIELD: 'label',
    }));
    request = jest.spyOn(service as any, 'authedRequest').mockImplementation(async (_user, _method, path) =>
      path === '/api/AppStruct' ? fixture() : [{ id: 'custom', label: 'Custom action' }]);
    const options = await service.getCommunicationOptions('user');
    expect(options.actions).toEqual([{ value: 'custom', label: 'Custom action' }]);
    expect(options.objectives[0].value).toBe('négociation/relanceoffre');
    expect(request.mock.calls.filter((call) => call[2] === '/api/AppStruct')).toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps an incomplete explicit override unavailable instead of silently using native choices', async () => {
    service = new CrmService({ crmCredential: { findUnique: credential } } as any, new ConfigService({
      ...settings, CRM_ACTION_OPTIONS_PATH: '/api/custom/actions',
    }));
    request = jest.spyOn(service as any, 'authedRequest').mockResolvedValue(fixture());
    expect(await service.getCommunicationOptions('user')).toMatchObject({ actions: [], actionsAvailable: false, objectivesAvailable: true });
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('CRM company-scoped contact lookup', () => {
  const settings = { CRM_BASE_URL: 'https://crm.example.test', CRM_ENCRYPTION_KEY: 'test' };
  let service: CrmService;
  let request: jest.SpyInstance;

  beforeEach(() => {
    service = new CrmService({
      crmCredential: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'user' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'credential' }),
      },
    } as any, new ConfigService(settings));
    request = jest.spyOn(service as any, 'authedRequest');
    jest.spyOn(service, 'getCompanies').mockResolvedValue([
      { id: 'company-a', name: 'Société A' },
      { id: 'company-b', name: 'Société B' },
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('asks Sellbase for only the selected company contacts and caches that result', async () => {
    request.mockResolvedValue({ records: [
      { pers_personid: 'person-a', pers_companyid: 'company-a', pers_fullname: 'Alice Martin' },
    ] });

    await expect(service.searchContacts('user', 'company-a', 'alice')).resolves.toEqual({
      items: [{ id: 'person-a', companyId: 'company-a', companyName: 'Société A', name: 'Alice Martin' }],
      total: 1,
    });
    await service.searchContacts('user', 'company-a', 'martin');

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('user', 'POST', '/api/Data/person/list', [{
      fieldName: 'pers_companyid', value: 'company-a', operator: 0, nodeOperator: 0,
    }]);
  });

  it('keeps each company cache isolated', async () => {
    request
      .mockResolvedValueOnce([{ pers_personid: 'person-a', pers_companyid: 'company-a', pers_fullname: 'Alice' }])
      .mockResolvedValueOnce([{ pers_personid: 'person-b', pers_companyid: 'company-b', pers_fullname: 'Bob' }]);

    expect((await service.searchContacts('user', 'company-a', '')).items[0].id).toBe('person-a');
    expect((await service.searchContacts('user', 'company-b', '')).items[0].id).toBe('person-b');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed contact request, allowing an immediate retry', async () => {
    request
      .mockRejectedValueOnce(new ServiceUnavailableException('CRM request failed'))
      .mockResolvedValueOnce([]);

    await expect(service.searchContacts('user', 'company-a', '')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.searchContacts('user', 'company-a', '')).resolves.toEqual({ items: [], total: 0 });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps global contact search compatible when no company is selected', async () => {
    request.mockResolvedValue([]);
    await service.searchContacts('user', '', '');
    expect(request).toHaveBeenCalledWith('user', 'GET', '/api/Data/person/list');
  });

  it('warms companies at startup without downloading every contact', async () => {
    const getCompanies = jest.mocked(service.getCompanies);
    const getPersons = jest.spyOn(service as any, 'getPersons');

    await service.onModuleInit();

    expect(getCompanies).toHaveBeenCalledWith('user');
    expect(getPersons).not.toHaveBeenCalled();
  });
});

describe('CRM transport and reconciliation', () => {
  const communicationId = '4c99f7a3-6af1-4c6c-8e5c-bf4f916419ee';
  const record = { companyId: 'company', subject: 'Changed', note: 'Changed', datetime: new Date('2026-09-16T08:30:00Z') };
  const originalFetch = global.fetch;
  let service: CrmService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new CrmService({} as any, new ConfigService({ CRM_BASE_URL: 'https://crm.example.test', CRM_ENCRYPTION_KEY: 'test' }));
    jest.spyOn(service as any, 'getToken').mockResolvedValue('token');
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it.each([
    [400, `Unknown communication ${communicationId}`, 'text/plain', false],
    [404, JSON.stringify({ message: 'Communication not found', id: communicationId }), 'application/json', false],
    [404, '<html><title>404 - Not found</title></html>', 'text/html', null],
    [404, `<html>Unknown communication ${communicationId}</html>`, 'text/plain', null],
    [404, '', 'application/json', null],
    [404, '{"error":"Unknown API route"}', 'application/json', null],
    [400, `Unknown field in communication ${communicationId}`, 'text/plain', null],
    [403, `Unknown communication ${communicationId}`, 'text/plain', null],
    [500, `Unknown communication ${communicationId}`, 'text/plain', null],
  ])('distinguishes confirmed missing records from status %s response %s', async (status, body, contentType, expected) => {
    fetchMock.mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': contentType } }));
    expect(await service.communicationExists('user', communicationId)).toBe(expected);
  });

  it('keeps the outcome unknown when the CRM is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network failure'));
    expect(await service.communicationExists('user', communicationId)).toBeNull();
  });

  it('refreshes an expired token once before confirming that a communication exists', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ comm_communicationid: communicationId }), { status: 200 }));
    expect(await service.communicationExists('user', communicationId)).toBe(true);
    expect((service as any).getToken).toHaveBeenNthCalledWith(2, 'user', true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([200, 204])('accepts an empty successful update response with status %s', async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    expect(await service.updateCommunication('user', communicationId, record)).toEqual({ id: communicationId, updatedIds: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('parses a nonempty JSON update response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([communicationId]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await service.updateCommunication('user', communicationId, record)).toEqual({ id: communicationId, updatedIds: [communicationId] });
  });

  it.each([
    false, { success: false }, { Success: false }, { error: 'Invalid record' },
    { Error: 'Invalid record' }, { errors: ['Invalid objective'] }, { Errors: { field: ['Invalid objective'] } },
  ].map((body) => [body]))('rejects an explicit JSON error acknowledgement %j despite HTTP 200', async (body) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    await expect(service.updateCommunication('user', communicationId, record)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('does not mistake an empty errors list for a failed update', async () => {
    const body = { success: true, errors: [] };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    expect(await service.updateCommunication('user', communicationId, record)).toEqual({ id: communicationId, updatedIds: body });
  });

  it('retries a 401 as the same PUT with the same ID and body after refreshing the token', async () => {
    (service as any).getToken.mockResolvedValueOnce('expired').mockResolvedValueOnce('fresh');
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await service.updateCommunication('user', communicationId, record);
    expect((service as any).getToken).toHaveBeenNthCalledWith(2, 'user', true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toBe(`https://crm.example.test/api/Data/communication/${communicationId}`);
      expect(init.method).toBe('PUT');
      expect(Array.isArray(JSON.parse(init.body))).toBe(false);
      expect(JSON.parse(init.body).comm_communicationid).toBe(communicationId);
    }
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
  });

  it.each([
    [200, '', 'text/html'],
    [200, '<html>Login required</html>', 'text/html'],
    [200, '<html>Proxy reply</html>', 'application/json'],
    [200, '{invalid', 'application/json'],
    [400, '{"error":"Invalid communication"}', 'application/json'],
    [404, '{"error":"Communication not found"}', 'application/json'],
    [500, 'Unavailable', 'text/plain'],
  ])('rejects status %s body %s without falling back to creation', async (status, body, contentType) => {
    fetchMock.mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': contentType } }));
    await expect(service.updateCommunication('user', communicationId, record)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it.each(['login', 'request'])('bounds a %s network request to 30 seconds and handles its abort', async (kind) => {
    const controller = new AbortController();
    const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    fetchMock.mockImplementation((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')), { once: true });
    }));
    const pending = kind === 'login'
      ? (service as any).login('login', 'password')
      : (service as any).fetchCrm('GET', '/api/Data/company/list', 'token');
    const rejected = expect(pending).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    controller.abort();
    await rejected;
  });

  it.each(['login', 'request'])('does not report success when the %s response body times out after its headers', async (kind) => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: jest.fn().mockRejectedValue(new DOMException('Timed out', 'AbortError')),
      text: jest.fn().mockRejectedValue(new DOMException('Timed out', 'AbortError')),
    });
    const pending = kind === 'login'
      ? (service as any).login('login', 'password')
      : (service as any).authedRequest('user', 'POST', '/api/Data/communication', []);
    await expect(pending).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
