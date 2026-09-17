# Recette CRM — dernière livraison

L’édition depuis l’historique et son renvoi vers le CRM sont implémentés. La recette réelle du 17 septembre 2026 a confirmé `PUT /api/Data/communication/{id}` avec un **objet JSON**, tandis que `POST /api/Data/communication` attend un tableau contenant la communication. L’application conserve le même `comm_communicationid`, utilise les dates `comm_datetime` / `comm_todatetime` et transmet les objectifs multiples dans **`comm_liste_objectifs`**, en minuscules. La création, la modification et l’effacement ont été vérifiés par relecture de l’API CRM sur des communications entièrement fictives, sans société ni contact.

La [recette du 17 septembre](RECETTE_2026-09-17.md) détaille également les interactions validées sur simulateur iOS, la connexion et la lecture FDS validées sur l’émulateur Android, ainsi que les transcriptions longues réelles. Les parcours CRM Android et les contrôles sur appareils physiques restent non validés. L’interface iOS utilisait une API et un simulateur CRM locaux ; elle n’a pas modifié de communication client réelle.

## Édition et renvoi depuis l’historique

- Le formulaire de revue est prérempli sans relancer l’enregistrement ni la transcription. La sauvegarde conserve l’audio initial et l’identifiant CRM.
- Les modifications sont enregistrées avec une révision ; un formulaire ancien ne peut pas écraser silencieusement une modification plus récente. Après un conflit, l’utilisateur peut recharger la version serveur tout en conservant sa saisie pour la comparer et réessayer.
- Une modification rend la note « À envoyer ». Un échec de synchronisation conserve le texte enregistré ; seul un succès confirmé peut afficher « Synchronisé ».
- Société et contact restent fixes dès qu’un identifiant CRM est réservé. Le changement des liaisons CRM nécessite son propre contrat ; les textes du compte rendu, dates et autres champs restent modifiables.
- Les nouveaux envois réservent l’identifiant distant en base avant l’appel réseau. Un renvoi vérifie d’abord cet identifiant ; une réponse distante incertaine ne déclenche pas une création avec un nouveau GUID. Un verrou en base empêche deux envois simultanés.
- Les anciens échecs sans identifiant CRM reçoivent le code `legacy_uncertain` : leur ancien envoi doit être vérifié avant toute nouvelle création, car il a pu réussir sans que l’application reçoive la réponse. Modifier le texte ne retire pas cette protection.
- La capacité `crmUpdateAvailable` est maintenant `true` : le mobile permet d’enregistrer puis d’envoyer une modification. Un échec de PUT ne déclenche jamais un POST de création de secours.
- Les objectifs sont sélectionnés par cases à cocher et transmis comme tableau ; `[]` efface la sélection. La migration conserve l’ancien objectif unique. Les champs scalaires restent des miroirs du premier objectif pour les anciens clients.

Les succès PUT 204 ou 200 vides sont acceptés ; un corps non vide doit être un JSON valide sans erreur explicite. Les pages HTML, erreurs HTTP, réponses mal formées et erreurs JSON explicites sont refusées. Les PUT réels de recette ont répondu HTTP 200 et leur effet a été confirmé par GET. Société, contact et propriétaire ne sont pas modifiés par ce PUT.

Les vérifications incluent les envois concurrents sur PostgreSQL isolé, les objectifs multiples, les entrées multipart/JSON, le maintien du GUID, le renouvellement du jeton et les erreurs de transport. La consolidation finale du 17 septembre passe avec **262 tests API dans 21 suites** (hors évaluations IA distantes), intégrations PostgreSQL comprises sur la base isolée `molyscan_native_qa` (port 55434), ainsi que **48 tests mobiles dans 5 suites** et la vérification TypeScript mobile. Les 28 migrations s’appliquent sur une base vierge ; un contrôle séparé confirme la conservation des anciens objectifs uniques et des sélections vides. Après les corrections issues du CRM réel, les **76 tests de `crm.service.spec.ts`** et la compilation API ont également été relancés avec succès. Ces contrôles de services ne constituent pas une recette sur téléphone.

## Recette réelle de l’adaptateur CRM

La lecture d’AppStruct a confirmé que société et contact sont facultatifs. Le bundle public ICyPWA confirme le nettoyage par `DELETE /api/Data/communication/{id}`. Les écritures ont été limitées aux GUID des fixtures `MOLYSCAN QA`, avec `comm_companyid: null`, aucun contact, aucun lien `comm_link` et une seule communication de test active à la fois.

Deux écarts de l’exemple initial ont été corrigés : le tableau envoyé en PUT provoquait HTTP 400, car cette route attend un objet ; `Comm_liste_objectifs` était ignoré silencieusement malgré HTTP 200. La casse `comm_liste_objectifs` correspond à AppStruct et sa persistance est désormais vérifiée sur le CRM réel.

Le cycle final a réussi :

1. POST d’une communication fictive et d’un objectif, puis GET confirmant le GUID, le texte, l’action `meeting` et l’absence de société/contact.
2. PUT sur ce même GUID avec texte modifié, début à 11:30, fin à 12:45 et deux objectifs : `autre` et `négociation/relanceoffre`.
3. GET confirmant le texte, les dates ISO avec décalage `+02:00` et les deux objectifs, renvoyés par le CRM sous forme de chaîne séparée par des virgules.
4. PUT avec note vide et `comm_liste_objectifs: []`, puis GET confirmant `comm_note: null` et `comm_liste_objectifs: ""`.
5. DELETE HTTP 200, puis GET HTTP 404 confirmant la suppression.

Trois fixtures ont été créées successivement pour corriger puis revalider le contrat ; elles ont toutes été supprimées. Aucune fiche société, aucun contact, aucun référentiel et aucun courriel n’ont été créés ou modifiés. Le CRM effectue une suppression logique : le GUID supprimé reste réservé et sa recréation est refusée. Un GET 404 générique reste donc traité comme un résultat incertain par la reprise d’envoi, sans POST automatique.

Rapport local sans identifiants sensibles : `/tmp/molyscan-native-qa-20260917/crm-real-report.json`. Le conteneur local utilisé pour lire les identifiants a été remis à l’arrêt ; aucun secret ni jeton n’a été enregistré dans ce rapport.

## Parcours iOS de l’historique

Sur iPhone 13 Pro Max simulé, iOS 26.5, le texte et les objectifs ont été modifiés depuis l’historique : `négociation/relanceoffre` remplacé par `graisses`, avec `autre` conservé. La sauvegarde seule affiche l’état en attente et laisse intact l’ancien contenu du CRM local. L’action Retry synchronise ensuite la nouvelle version sur le même GUID. Les horaires affichés sont 11:30–12:45.

Le retrait de tous les objectifs a également été testé avec une panne CRM HTTP 503 simulée. La modification reste enregistrée avec l’état d’échec ; après reprise du CRM local, Retry réussit, conserve le GUID et transmet `comm_liste_objectifs: []`. Cette recette de l’interface est distincte du contrôle de l’API Innovation réelle ci-dessus.

## Transcription et horaires

- Les deux parcours vocaux utilisent maintenant le même transport de transcription, avec 180 secondes pour l'envoi et la réponse, au lieu de 30 secondes. Whisper a un délai maximum explicite de 120 secondes sans relance automatique ; une panne renvoie une erreur HTTP exploitable au lieu d'un faux succès vide.
- L'écran reste éveillé pendant l'enregistrement et la transcription pour éviter l'interruption liée au verrouillage automatique, souvent réglé à 30 secondes. Le verrou est libéré à l'arrêt et en quittant l'écran. L'enregistrement en arrière-plan ou après verrouillage manuel n'est pas activé.
- Après un échec, l'audio reste disponible dans le formulaire pour relancer la transcription. Un compte rendu peut être saisi manuellement et enregistré sans relancer automatiquement Whisper.
- Les dates envoyées au CRM utilisent `CRM_TIME_ZONE`, avec `Europe/Paris` par défaut. Cette conversion gère l'heure d'été/hiver et ne dépend plus de l'heure du serveur. Le texte du compte rendu utilise la même conversion.
- Une date et une heure de fin sont enregistrées et envoyées via `comm_todatetime`. Déplacer le début conserve la durée choisie ; une fin antérieure ou égale au début est refusée.

La capture iOS native a été vérifiée à **101,887710 secondes** par ses métadonnées, avec chronomètre observé après 30 secondes. Son téléversement local a été intercepté avec HTTP 503 pour ne pas transmettre de son ambiant ; le repli dans le formulaire de revue est visible. Indépendamment, deux fichiers fictifs de **90 et 180 secondes** ont été transcrits par Whisper réel avec tous les repères initiaux, après 30 secondes et finaux. Voir [RECETTE_2026-09-17.md](RECETTE_2026-09-17.md) pour les durées, résultats et limites.

## Listes Action et Objectifs : source native vérifiée

Le formulaire, la persistance, l'endpoint authentifié Molyscan `GET /api/crm/communication-options`, la validation des codes et l'envoi sont implémentés. Par défaut, les listes proviennent de `GET /api/AppStruct` dans Innovation CRM, avec les identifiants du commercial connecté. Aucun code ni libellé n'est inventé ou déduit des anciennes notes.

La vérification du 17 septembre 2026 a été effectuée en lecture seule. Le frontend public `/ICyPWA`, notamment le bundle `chunk-QOOUA7P3.js`, utilise `fetchAppStruct` puis `getPicklist`, qui filtre les traductions hors ligne sur `type: choices` et leur `family`. Un GET authentifié de `/backend/icyapi/api/AppStruct` a répondu HTTP 200 et fourni **18 actions** pour `comm_action` et **25 objectifs** pour `comm_liste_objectifs`. Les champs `code` et `capt` donnent la valeur et le libellé ; la séquence du tableau est conservée comme dans ICyPWA, sans nouveau tri sur `order`. Les métadonnées `screenBlocks` confirment les familles via `lookupFamily` et le caractère multiple des objectifs. Ces nombres décrivent la réponse observée ; les choix sont chargés dynamiquement et ne sont pas figés dans l'application.

Le champ d'envoi reste `comm_action`, avec la valeur historique `vocal` quand aucune action n'est sélectionnée, et `comm_liste_objectifs` pour le tableau des objectifs. La casse du champ d'envoi est identique à celle de sa famille dans les métadonnées. Les documents Sellbase concernent le PIM, distinct de cette intégration.

Les surcharges suivantes restent facultatives pour une installation utilisant d'autres endpoints. Les laisser vides utilise la source native AppStruct :

| Variable | Surcharge facultative |
|---|---|
| `CRM_ACTION_OPTIONS_PATH` | Chemin GET de la liste des actions, commençant par `/api/` |
| `CRM_ACTION_VALUE_FIELD` | Propriété portant le code à envoyer dans `comm_action` |
| `CRM_ACTION_LABEL_FIELD` | Propriété portant le libellé à afficher |
| `CRM_OBJECTIVE_OPTIONS_PATH` | Chemin GET de la liste des objectifs |
| `CRM_OBJECTIVE_VALUE_FIELD` | Propriété portant le code objectif |
| `CRM_OBJECTIVE_LABEL_FIELD` | Propriété portant le libellé objectif |

Pour ces surcharges, les réponses prises en charge sont un tableau d'objets, `{ records: [...] }` ou `{ data: [...] }`, avec propriétés de code/libellé directement dans chaque objet. Le cache des listes est isolé par commercial et valide cinq minutes. Une liste absente ou mal formée est signalée comme indisponible ; le formulaire permet de continuer sans choix, en conservant le comportement historique `comm_action: vocal`. Les choix fournis sont contrôlés côté serveur avant la création de la note puis avant l'envoi ; les libellés viennent exclusivement du CRM. Si la source devient indisponible, une note portant déjà une action ou des objectifs explicites ne peut pas être renvoyée sans validation de ses choix. L’ancienne variable `CRM_OBJECTIVE_COMMUNICATION_FIELD` n’est plus utilisée.

Une vérification avec le service Molyscan compilé confirme aussi les 18/25 choix, la validation de deux objectifs dont un code avec accents et barre oblique, et la réutilisation du cache après un seul GET réel. Le transport de ce contrôle des référentiels refuse toute méthode autre que GET et toute route autre qu'AppStruct. La recette d’écriture décrite plus haut confirme ensuite la création, le PUT, les horaires persistés et l’effacement des objectifs. Leur affichage et leur manipulation ont été exercés sur simulateur iOS avec ces choix et un CRM local.

## Déploiement et validation

Appliquer les migrations `20260916100000_voice_note_crm_fields`, `20260917100000_voice_note_edit_sync` et `20260917140000_voice_note_objectives_list`, régénérer Prisma et reconstruire l'API. Déployer le mobile et l’API correspondants ensemble : la modification exige `expectedRevision` et les nouveaux choix sont transmis dans `crmObjectiveCodes`. Le mobile doit être reconstruit avec la dépendance Expo `expo-keep-awake` déjà compatible avec SDK 54. Le lot documents ajoute aussi des dépendances natives de partage/ouverture PDF : de nouveaux binaires iOS et Android sont nécessaires, une mise à jour JavaScript/OTA seule ne suffit pas. Vérifier un délai `proxy_read_timeout` de **180s** dans le proxy réellement déployé pour permettre une transcription lente de finir.

Tests automatisés : `crm.service.spec.ts` (**76 tests réussis**, dates hiver/été, transitions DST, fin distincte, codes invalides, listes indisponibles ou mal formées, PUT objet, casse du champ des objectifs et renouvellement du jeton), `voice-notes.service.spec.ts` (validation, persistance, envoi, saisie manuelle et échec CRM), `transcription.service.spec.ts` mobile (réponse après 65 secondes, erreurs et réponses invalides).

Compléments de recette Android et sur appareils physiques, encore nécessaires :

- Enregistrer 90 secondes en laissant l'écran sans interaction, prononcer un repère après 30 secondes et un à la fin ; retrouver les deux dans la transcription. Tester aussi 3 à 5 minutes.
- Couper le réseau à la transcription puis relancer sans refaire l'enregistrement ; vérifier que les champs CRM saisis restent présents.
- Vérifier visuellement un rendez-vous passant minuit et un rendez-vous à une date d'hiver ; les conversions correspondantes sont déjà couvertes par les tests automatisés.
- Sur un simulateur ou un environnement de recette distinct, changer une option de référentiel, attendre l'expiration du cache et vérifier sa mise à jour.
- Reprendre sur Android les interactions d’édition, de retrait des objectifs et de renvoi après panne déjà validées sur simulateur iOS. Contrôler les autorisations micro et interruptions sur appareils physiques.

Les écritures CRM de recette ont concerné uniquement les communications fictives décrites plus haut, ensuite supprimées. La découverte des référentiels est restée en lecture seule. Aucune donnée client n’a été modifiée ; aucune migration de production ni aucun déploiement n’a été effectué.
