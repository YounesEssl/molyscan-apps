# Tests Molyscan

## Vérifications locales

Depuis la racine du dépôt :

```bash
npm run db:generate
npm run build:api
npm run build:admin
cd apps/mobile && npx tsc --noEmit
```

Les tests API sans appels aux modèles IA ni au PIM :

```bash
npm -w api test -- --runInBand --testPathIgnorePatterns='rag.real-eval|rag.prod-feedback'
```

Les tests PostgreSQL de la veille sont ignorés sans `ADMIN_TEST_DATABASE_URL`. Les activer avec une base de test migrée, distincte des données utilisées en production :

```bash
ADMIN_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/molyscan_release \
  npm -w api test -- --runInBand --testPathPatterns=admin-insights.integration
```

Ils créent des données identifiées par UUID et les retirent après exécution. Ils vérifient les agrégats, la pagination, les scans par code-barres, les auteurs et les bornes de journées parisiennes au changement d’heure.

Les tests PostgreSQL des notes CRM s’activent séparément sur une base de test migrée :

```bash
VOICE_NOTES_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/molyscan_crm_edit \
  npm -w api test -- --runInBand --testPathPatterns=voice-notes.integration
cd apps/mobile && npm test -- --runInBand
```

La consolidation finale du 17 septembre 2026 passe avec **262 tests API dans 21 suites**, dont les intégrations admin et notes CRM, **48 tests mobiles dans 5 suites** et `tsc --noEmit` côté mobile. Pour cette exécution, `DATABASE_URL`, `ADMIN_TEST_DATABASE_URL` et `VOICE_NOTES_TEST_DATABASE_URL` pointaient explicitement vers `postgresql://postgres@127.0.0.1:55434/molyscan_native_qa`, base isolée avec 28 migrations appliquées. Les fixtures PostgreSQL ont été supprimées après les tests ; aucune base de production n’a été utilisée.

Ils vérifient la sauvegarde concurrente, la réservation du GUID avant l’envoi, l’exclusion des doubles envois et la reprise après perte d’une réponse. Les appels CRM de ces tests PostgreSQL sont simulés. Le contrat vérifié séparément sur le CRM réel utilise **un objet JSON** pour `PUT /api/Data/communication/{id}` ; le POST de création utilise un tableau. Les objectifs multiples sont transmis dans **`comm_liste_objectifs`**, en minuscules. Les tests mobiles couvrent notamment les différences de formulaire, la conservation de la saisie après conflit, les statuts d’envoi et les capacités indisponibles.

Une vérification distincte, en lecture seule le 17 septembre 2026, a confirmé la source réelle des listes CRM : le frontend public `/ICyPWA` utilise AppStruct, puis le GET authentifié `/backend/icyapi/api/AppStruct` a répondu HTTP 200 avec 18 actions et 25 objectifs. Les entrées `type: choices` sont filtrées par familles `comm_action` et `comm_liste_objectifs` ; `code`, `capt` et `order` portent les valeurs, libellés et ordre. Les métadonnées confirment les objectifs multiples. Cette observation valide la source des référentiels, sans constituer une preuve d’écriture CRM. L’application les charge dynamiquement par commercial et les conserve cinq minutes en cache ; les surcharges d’endpoints restent facultatives.

La recette réelle d’écriture du 17 septembre a ensuite réussi avec le service compilé : POST et GET d’une communication fictive, PUT sur le même GUID du texte, des horaires et de deux objectifs (`autre`, `négociation/relanceoffre`), GET de confirmation, puis PUT d’une note vide et de `comm_liste_objectifs: []` et nouvelle relecture. Les horaires sont revenus avec le décalage `+02:00` attendu ; les objectifs ont été persistés, puis effacés. Société et contact sont restés `null`. Les trois fixtures successives nécessaires aux corrections ont toutes été supprimées par DELETE HTTP 200, suivi d’un GET HTTP 404 ; une seule communication de recette était active à la fois. Aucune donnée client ni aucun référentiel n’a été modifié. Les suppressions sont logiques et les GUID restent réservés : un 404 générique ne permet donc pas de conclure qu’une nouvelle création serait sûre.

Après ces corrections, **les 76 tests de `crm.service.spec.ts` et la compilation API passent**. Ces tests contrôlent notamment la forme objet du PUT, la casse du champ des objectifs et le maintien du même corps après un renouvellement du jeton. La recette de l’interface iOS a été effectuée séparément avec une API et un CRM locaux. Détails : [CRM_DELIVERY.md](CRM_DELIVERY.md) et [RECETTE_2026-09-17.md](RECETTE_2026-09-17.md).

## Évaluations IA : distinguer les niveaux de preuve

| Commande depuis `apps/api` | Dépendances réelles | Ce que le résultat prouve |
|---|---|---|
| `npm run test:eval` | Aucune : Gemini et retrieval simulés | Construction du contexte et passage des données ; **ne mesure pas la qualité du modèle**, dont la réponse est prédéfinie |
| `npm run test:eval:real` | Gemini, OpenAI embeddings, PostgreSQL avec index PIM actif | Régression sur cinq conversations historiques, avec vérification des noms attendus et des produits interdits en tête de réponse |
| `npm run test:prod-feedback` | Même stack réelle | Rapport de mesure sur les signalements historiques ; les cas manqués figurent dans le rapport mais **ne font pas échouer Jest** |

Les deux évaluations réelles utilisent `PrismaService` pour accéder à l’index PIM actif, comme l’application. Sans index actif, le retrieval peut retomber sur l’ancien Supabase. Une adresse Supabase inaccessible ne permet pas d’évaluer la qualité des réponses.

Les clés et paramètres sont lus dans `apps/api/.env`. `DATABASE_URL` peut être surchargée pour une base de test. Une synchronisation PIM préalable construit l’index ; cette opération écrit dans la base ciblée :

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/molyscan_release \
  npm -w api run rag:sync:pim
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/molyscan_release \
  npm -w api run test:eval:real
```

Les cinq cas couvrent Cimcool P80, Klüber ISOFLEX NBU 15, Klüber Paraliq P 68, Bonderite L-FM L67 et RENOFORM DSW 1002. Les alternatives acceptées figurent dans `apps/api/src/chat/rag/__tests__/eval.fixtures.ts`. Les fiches du catalogue évoluent : une attente historique doit être réévaluée par un expert si le produit a disparu ou changé. Ne pas modifier les attentes simplement pour rendre les tests verts.

Une détection par nom ne remplace pas une validation technique humaine des applications, certifications, viscosités et conditions d’utilisation. Une réponse qui cite un produit pour l’écarter peut contenir son nom sans le recommander.

Les rapports distinguent les cas tentés, terminés, en erreur et incomplets. Un appel qui dépasse le délai reste compté comme incomplet ; il ne réduit pas artificiellement le nombre de cas évalués. Les sources affichées sont celles de l’appel qui a produit la réponse, sans seconde recherche indépendante.

## Régressions de la dernière livraison

- `scans/image-analysis.service.spec.ts` : priorité des décisions expertes, absence d’équivalent, retrait du cache d’anciennes suggestions, catalogue vide, sortie JSON invalide, noms de produits absents des sources et isolation des requêtes rejouées.
- `scans/scans.service.spec.ts` : signalement sans suggestion obligatoire, propriété du scan, restrictions de rôle et produit effectivement proposé.
- `chat/rag/__tests__/rag.expert-decisions.spec.ts` : décision négative en chat normal et streaming, suivis sans nom, changement de produit, ambiguïtés de marque, confusions de grades et maintien des questions techniques/PDF.
- `chat/__tests__/chat.service-context.spec.ts` : transmission du contexte produit dans le parcours non streaming.
- `pim/__tests__/pim.normalizer.spec.ts` et `chat/rag/__tests__/vector-store.certifications.spec.ts` : certifications explicites et logos PIM, séparation des émetteurs, catégories H1/A1 et absence de preuve non interprétée comme certification.
- `admin/equivalences/equivalences.service.spec.ts` : transitions vers et depuis « Aucun équivalent », validation du nom et suppression ciblée.
- `admin/admin-insights.service.spec.ts` et `admin-insights.integration.spec.ts` : statistiques et demandes avec auteur.
- Les tests CRM couvrent les dates UTC/Paris hiver/été dans les champs confirmés `comm_datetime` / `comm_todatetime`, la fin de rendez-vous, les listes de référence et la conservation d’une note en cas d’échec CRM. Les objectifs sont transmis dans `comm_liste_objectifs`, tableau de chaînes ; les tests vérifient les objectifs multiples, leur conservation ou effacement explicite et la compatibilité avec l’ancien objectif unique. Voir [CRM_DELIVERY.md](CRM_DELIVERY.md).
- L’extension du 17 septembre couvre l’édition avec révision, les envois concurrents, les résultats distants incertains et la sauvegarde sans écriture CRM. La création exige une réponse contenant le GUID attendu ; le PUT conserve cet identifiant et son échec ne retombe jamais sur une création.
- Les tests documents couvrent la résolution PIM, les demandes FT/FDS, les produits ambigus, les grades inconnus, le retrait d’une recommandation, la conservation du contexte après une réponse courte et le rejet d’une réponse HTML à la place d’un PDF.

Les suites `sellbase.documents.spec.ts` et `products.documents.spec.ts` passent **31 tests API** : chemins FDS publics, compatibilité FT, surcharge authentifiée, isolation par tenant, validation des chemins, signature PDF, refus des redirections et limite de taille. Une vérification distincte en lecture réelle a téléchargé quatre FDS avec HTTP 200, type `application/pdf` et signature PDF valide : AGL 41 NF FR/GB, BLACK SEAL et AN 310. Le tenant `c_molydal` utilise par défaut l’archive publique Sellbase et les sous-dossiers dérivés du nom de fichier fourni par le PIM ; `SELLBASE_MEDIA_BASE_URL` est une surcharge facultative pour d’autres environnements. Aucun identifiant Sellbase n’est envoyé à cette archive publique. Voir [PIM_RAG.md](PIM_RAG.md) pour les sources et les tailles vérifiées.

## Ajouter un signalement reproductible

Conserver le nom et la marque exacts du concurrent, la réponse obtenue, la fiche ou l’usage à l’origine du besoin et la correction confirmée par l’équipe Molydal. Les signalements mobiles et les conversations transmises sont visibles avec leur auteur dans « Signalements IA » de l’admin.

Ajouter le cas dans `prod-feedback.fixtures.ts` pour mesurer la stack réelle. Une correction métier déjà confirmée peut être enregistrée dans les équivalences expertes, y compris « Aucun équivalent ». Elle prend alors priorité sur les suggestions IA pour les prochains scans et échanges liés au produit.

## Recette sur appareils

La [recette du 17 septembre](RECETTE_2026-09-17.md) décrit les contrôles réalisés sur **iPhone 13 Pro Max simulé, iOS 26.5** : connexion QA, FDS AGL 41 NF sur sept pages et export dans Fichiers vérifié par empreinte, FT LUZOL FOOD G00 avec renouvellement JWT après 401, modification des notes CRM et reprise après HTTP 503, retrait de tous les objectifs avec le même GUID et horaires 11:30–12:45. L’API et le CRM de ce parcours sont locaux ; le vrai contrat Innovation est validé indépendamment sur les communications fictives décrites plus haut.

La capture iOS native a duré **101,887710 secondes**, d’après les métadonnées du fichier. Sa transcription est volontairement interceptée localement par HTTP 503 : aucun son ambiant n’est transmis à OpenAI. Les fichiers fictifs de **90 et 180 secondes** ont, séparément, été transcrits par Whisper réel avec tous les repères attendus. Ces vérifications ne sont pas comptées dans les 262 tests API ou les 48 tests mobiles.

L’APK QA Android **1.0.1 / 30**, `com.molydal.molyscan.qa`, est construit, signé en debug et installé. Dans l’émulateur intégré à Android Studio, la connexion QA, le téléchargement de la FDS depuis la conversation et son affichage dans le lecteur externe sont validés, avec les pages 1 et 2 contrôlées. Le retour à **Your PDF is ready** et la présence de **Save or share** sont confirmés ; le partage et la FT Android restent en cours de contrôle.

L’absence de lecteur PDF n’a pas été testée, puisqu’un lecteur est installé. Les parcours CRM Android et les appareils physiques restent non validés, notamment les autorisations et interruptions micro, le verrouillage et la reprise d’un téléversement audio après coupure réseau. Le parcours complet de signalement puis de nouveau scan sur appareil et le rafraîchissement après modification d’un référentiel de recette restent également à contrôler. Aucun déploiement de production n’a été effectué.
