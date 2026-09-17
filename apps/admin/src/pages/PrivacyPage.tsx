export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper px-6 py-16">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-12">
          <div className="mb-8 flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Molyscan
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
              by Molydal
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">
            Données personnelles
          </p>
          <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-[1.1] tracking-tight text-ink">
            Politique de{' '}
            <span className="italic text-red">confidentialité</span>
          </h1>
          <p className="mt-4 text-sm text-ink-2">
            Dernière mise à jour : 30 août 2026
          </p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-ink-2">

          {/* Intro */}
          <Section>
            <p>
              Molydal (« nous ») accorde une importance capitale à la protection
              de vos données personnelles. La présente politique décrit quelles
              données sont collectées via l'application mobile{' '}
              <strong className="text-ink">Molyscan</strong>, pourquoi, comment
              elles sont traitées et quels droits vous exercez en tant
              qu'utilisateur.
            </p>
          </Section>

          {/* 1. Responsable */}
          <Section title="1. Responsable du traitement">
            <Field label="Société">Molydal SAS</Field>
            <Field label="Activité">
              Fabrication et distribution de lubrifiants industriels
            </Field>
            <Field label="Contact">
              <a
                href="mailto:contact@molydal.com"
                className="text-red hover:underline"
              >
                contact@molydal.com
              </a>
            </Field>
          </Section>

          {/* 2. Données collectées */}
          <Section title="2. Données collectées">
            <p className="mb-4">
              Selon votre utilisation de l'application, nous collectons les
              données suivantes :
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 text-left text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
                  <th className="pb-2 pr-6">Catégorie</th>
                  <th className="pb-2">Données</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-4">
                {[
                  ['Identification', 'Nom, prénom, adresse email, société, téléphone, rôle (commercial / distributeur)'],
                  ['Photos produits', 'Images de produits concurrents photographiés ou importés depuis la galerie'],
                  ['Historique scans', 'Résultats d\'analyse IA, produits identifiés, équivalents proposés, scores de compatibilité'],
                  ['Notes vocales', 'Enregistrements audio et transcriptions générées automatiquement'],
                  ['Localisation', 'Position GPS optionnelle, utilisée uniquement pour géolocaliser un scan sur demande explicite'],
                  ['Notifications', 'Token Expo Push pour l\'envoi de notifications en lien avec votre activité'],
                  ['Connexion', 'Token d\'authentification JWT (stocké localement sur l\'appareil)'],
                ].map(([cat, desc]) => (
                  <tr key={cat}>
                    <td className="py-3 pr-6 font-medium text-ink">{cat}</td>
                    <td className="py-3 text-ink-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 3. Finalités */}
          <Section title="3. Finalités et bases légales">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 text-left text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
                  <th className="pb-2 pr-6">Finalité</th>
                  <th className="pb-2">Base légale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-4">
                {[
                  ['Partager avec Google Gemini et OpenAI les contenus choisis par l’utilisateur pour fournir les fonctions d’IA', 'Consentement explicite'],
                  ['Identifier les équivalents Molydal à des produits concurrents', 'Exécution du contrat'],
                  ['Gérer votre compte et vos accès', 'Exécution du contrat'],
                  ['Traiter les demandes de prix et notifier les commerciaux', 'Exécution du contrat'],
                  ['Enregistrer et transcrire les notes vocales CRM', 'Exécution du contrat'],
                  ['Envoyer des notifications push liées à votre activité', 'Consentement'],
                  ['Améliorer la pertinence des analyses IA (usage agrégé anonymisé)', 'Intérêt légitime'],
                ].map(([fin, base]) => (
                  <tr key={fin}>
                    <td className="py-3 pr-6 text-ink">{fin}</td>
                    <td className="py-3 font-medium text-ink-2">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 4. Partage avec les services d’IA */}
          <Section title="4. Partage avec des services d’intelligence artificielle">
            <p>
              Avant le premier envoi vers un service d’intelligence artificielle,
              Molyscan affiche une demande de consentement dans l’application.
              Aucun contenu choisi par l’utilisateur n’est transmis à Google
              Gemini ou à OpenAI tant que l’utilisateur n’a pas expressément
              sélectionné <strong className="text-ink">« J’accepte »</strong>.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] border border-ink-4 bg-paper-2 px-4 py-4">
                <p className="font-medium text-ink">Google Gemini</p>
                <p className="mt-1 text-sm">
                  Molyscan lui transmet les photos de produits prises ou choisies
                  par l’utilisateur, ses questions et les documents PDF qu’il
                  joint. Ces contenus servent exclusivement à identifier les
                  produits, rechercher leurs caractéristiques et générer les
                  réponses de l’assistant.
                </p>
              </div>
              <div className="rounded-[16px] border border-ink-4 bg-paper-2 px-4 py-4">
                <p className="font-medium text-ink">OpenAI</p>
                <p className="mt-1 text-sm">
                  Molyscan lui transmet les questions et le texte technique
                  nécessaire à la recherche sémantique, ainsi que les
                  enregistrements audio déclenchés par l’utilisateur afin de les
                  transcrire en texte.
                </p>
              </div>
            </div>
            <p className="mt-4">
              Ces transmissions ont lieu uniquement quand l’utilisateur lance
              la fonction concernée. Le refus empêche l’envoi et laisse
              accessibles les fonctions qui ne reposent pas sur l’IA. Le
              consentement peut être retiré à tout moment depuis{' '}
              <strong className="text-ink">
                Profil &gt; Partage de données avec l’IA
              </strong>
              . Un nouvel accord sera alors nécessaire avant tout nouvel envoi.
            </p>
            <p className="mt-4">
              Molydal exige contractuellement et par ses mesures de sécurité que
              Google et OpenAI protègent les données partagées au même niveau ou
              à un niveau équivalent à celui décrit dans la présente politique
              et requis par les règles applicables.
            </p>
          </Section>

          {/* 5. Sous-traitants */}
          <Section title="5. Sous-traitants et transferts hors UE">
            <p className="mb-4">
              Certains traitements sont assurés par des prestataires tiers. Nous
              nous assurons que chacun présente des garanties appropriées
              (clauses contractuelles types ou décision d'adéquation) :
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-4 text-left text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
                  <th className="pb-2 pr-4">Prestataire</th>
                  <th className="pb-2 pr-4">Rôle</th>
                  <th className="pb-2">Pays</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-4">
                {[
                  ['OVH', 'Hébergement des serveurs et stockage des photos', 'France (UE)'],
                  ['Supabase', 'Base de données vectorielle (recherche sémantique)', 'États-Unis¹'],
                  ['Google (Gemini)', 'Analyse des photos et PDF, recherche produit et assistant IA conversationnel, après consentement', 'États-Unis¹'],
                  ['OpenAI', 'Recherche sémantique et transcription des enregistrements audio, après consentement', 'États-Unis¹'],
                  ['Expo / EAS', 'Notifications push mobiles', 'États-Unis¹'],
                  ['Resend', 'Envoi d\'emails transactionnels', 'États-Unis¹'],
                ].map(([name, role, country]) => (
                  <tr key={name}>
                    <td className="py-3 pr-4 font-medium text-ink">{name}</td>
                    <td className="py-3 pr-4 text-ink-2">{role}</td>
                    <td className="py-3 text-ink-2">{country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-ink-3">
              ¹ Transferts encadrés par les clauses contractuelles types (CCT)
              approuvées par la Commission européenne.
            </p>
          </Section>

          {/* 6. Conservation */}
          <Section title="6. Durée de conservation">
            <ul className="list-none space-y-2">
              {[
                ['Données de compte', 'Pendant la durée d\'utilisation, puis suppression à la clôture du compte'],
                ['Photos et scans', 'Pendant la durée d\'utilisation, puis suppression à la clôture du compte'],
                ['Notes vocales et transcriptions', 'Pendant la durée d\'utilisation, puis suppression à la clôture du compte'],
                ['Logs de connexion', '12 mois glissants'],
                ['Données de notifications', 'Supprimées à la clôture du compte'],
              ].map(([type, duration]) => (
                <li key={type} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                  <span>
                    <strong className="text-ink">{type}</strong> — {duration}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Vous pouvez initier la suppression de votre compte directement
              dans l'application, depuis{' '}
              <strong className="text-ink">
                Profil &gt; Supprimer le compte
              </strong>
              . Le compte et les données associées sont alors supprimés. Seules
              les informations dont la conservation est imposée par une
              obligation légale peuvent être conservées pendant la durée
              requise.
            </p>
          </Section>

          {/* 7. Droits */}
          <Section title="7. Vos droits">
            <p className="mb-4">
              Conformément au Règlement Général sur la Protection des Données
              (RGPD — Règlement UE 2016/679), vous disposez des droits suivants
              sur vos données :
            </p>
            <ul className="list-none space-y-2">
              {[
                ['Droit d\'accès', 'Obtenir une copie de vos données personnelles'],
                ['Droit de rectification', 'Corriger des données inexactes ou incomplètes'],
                ['Droit à l\'effacement', 'Demander la suppression de vos données (« droit à l\'oubli »)'],
                ['Droit à la portabilité', 'Recevoir vos données dans un format structuré et lisible par machine'],
                ['Droit d\'opposition', 'Vous opposer à un traitement fondé sur l\'intérêt légitime'],
                ['Droit de retrait du consentement', 'Retirer votre consentement à tout moment, notamment pour les notifications ou le partage avec les services d’IA'],
              ].map(([right, desc]) => (
                <li key={right} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                  <span>
                    <strong className="text-ink">{right}</strong> — {desc}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              La suppression du compte peut être initiée directement dans
              l'application depuis le profil. Pour exercer vos autres droits,
              contactez-nous à{' '}
              <a href="mailto:contact@molydal.com" className="text-red hover:underline">
                contact@molydal.com
              </a>
              . Nous répondons dans un délai maximum de{' '}
              <strong className="text-ink">30 jours</strong>.
            </p>
            <p className="mt-3">
              Vous pouvez également introduire une réclamation auprès de la{' '}
              <strong className="text-ink">CNIL</strong> (
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red hover:underline"
              >
                www.cnil.fr
              </a>
              ).
            </p>
          </Section>

          {/* 8. Sécurité */}
          <Section title="8. Sécurité des données">
            <p>
              Vos données sont transmises via HTTPS (TLS 1.2+) et stockées sur
              des serveurs hébergés en France (OVH). Les accès à l'application
              sont protégés par authentification JWT. Les photos sont stockées
              sur un espace objet privé accessible uniquement via des URLs
              signées à durée limitée.
            </p>
          </Section>

          {/* 9. Modifications */}
          <Section title="9. Modifications de la politique">
            <p>
              Nous pouvons mettre à jour cette politique pour refléter des
              évolutions légales ou techniques. En cas de modification
              substantielle, vous serez informé par notification dans
              l'application. La date de dernière mise à jour est indiquée en
              haut de ce document.
            </p>
          </Section>

          {/* Contact */}
          <div className="rounded-[20px] border border-ink-4 bg-paper-2 px-6 py-5">
            <p className="text-sm font-semibold text-ink">Contact</p>
            <p className="mt-1 text-sm text-ink-2">
              Molydal SAS —{' '}
              <a href="mailto:contact@molydal.com" className="text-red hover:underline">
                contact@molydal.com
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm">
      <span className="font-medium text-ink">{label} : </span>
      <span className="text-ink-2">{children}</span>
    </p>
  );
}
