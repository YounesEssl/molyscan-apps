# Livraison 1.0.3 — option d'édition CRM désactivée

Cette livraison remplace les binaires 1.0.2 publiés plus tôt le 17 septembre. À la demande de Younes, la modification des notes CRM depuis l'historique et le renvoi de ces modifications restent une option payante, désactivée en production, activable ultérieurement sans nouvelle compilation mobile.

## Versions et périmètre

- Source applicative et binaires : `29c594fd1c73fd4fe52c87bd0bf345fb37929322`.
- Mobile : **1.0.3**, build iOS **9**, versionCode Android **32**.
- L'historique reste consultable ; la création de notes et la reprise du premier envoi non modifié restent disponibles.
- Aucun changement de schéma, aucune migration, aucun seed et aucune nouvelle synchronisation PIM. L'admin de la livraison précédente reste en place.

## Verrouillage serveur

L'API a été compilée sur Linux avant activation le **17 septembre 2026 à 23:29:27 Europe/Paris** (`21:29:27Z`). PM2 a été redémarré et sauvegardé avec `CRM_HISTORY_EDITING_ENABLED=false`, également enregistré dans le fichier d'environnement.

Le réglage est réservé à l'exploitant : aucun bouton d'administration client ni endpoint de modification ne permet de l'activer. La procédure d'activation et de désactivation est documentée dans [CRM_HISTORY_EDITING.md](CRM_HISTORY_EDITING.md).

Les contrôles publics à **23:32:29 Europe/Paris** ont confirmé :

- `GET /api/features` authentifié : HTTP 200, `crmHistoryEditingEnabled: false`, `Cache-Control: no-store`.
- `PATCH /api/voice-notes/:id` avec une identité et un identifiant de note fictifs : HTTP 403, code `CRM_HISTORY_EDITING_DISABLED`, avant lecture ou modification de la note.
- `/api/health` : HTTP 200, état `ok`.

Le serveur refuse également le renvoi des notes déjà modifiées (`revision != 0`) avant toute communication avec Innovation CRM. Les anciens binaires 1.0.2 peuvent encore afficher leur bouton, mais ne peuvent plus effectuer ces modifications. Les binaires 1.0.3 masquent les contrôles, bloquent l'accès direct au formulaire et relisent l'autorisation au retour sur l'écran, à la reprise de l'application et avant une action.

Aucune donnée client n'a été modifiée dans Innovation CRM. La fonctionnalité n'a pas été réactivée en production pour la tester.

## Vérifications

- **54 tests API ciblés** réussis, y compris les réponses HTTP authentifiées et les blocages avant appels CRM.
- **39 tests mobiles ciblés** réussis ; vérification TypeScript réussie.
- Compilations API locale et Linux réussies.
- Signature, version, structure et configuration API de production des artefacts Android validées. APK universel généré depuis le nouvel AAB ; bundle JavaScript identique et alignement 16 Ko valide.
- Aucun contrôle sur téléphone ou simulateur, conformément à la demande de Younes.

## Distribution mobile

### Android

AAB et APK construits localement avec le profil EAS production et la clé existante. Les copies temporaires des secrets de signature ont été supprimées. Artefacts et rapports conservés localement dans `build/releases/1.0.3/` (hors Git).

| Artefact | Taille | SHA-256 |
|---|---:|---|
| `Molyscan-1.0.3-32-production.aab` | 75 687 641 octets | `bffe347c3a3fb9abd0a329e3c013da2d21fcd623bde421acb8988db618811211` |
| `Molyscan-1.0.3-32-production.apk` | 122 733 207 octets | `e48e5a602275a383fc2a15908c14475585c3d4a90f4bfd7e1d4b29d1ab40d7bd` |

Google Play : **version 1.0.3 / code 32 envoyée pour examen**, observée dans « Modifications en cours d'examen » le 17 septembre à **23:35:24 Europe/Paris** (release 7). Déploiement complet à **100 %** ; publication gérée désactivée, donc mise à disposition automatique après approbation. Les vérifications rapides Google précèdent l'examen ; la version 1.0.3 n'est pas encore déclarée disponible publiquement.

### iOS

- Build EAS : `47de2da6-1486-4b1d-9dcc-0bc52eabe90d`.
- Version App Store Connect : `e12b02aa-4db6-4258-902e-570f827f82da`.
- Publication automatique après approbation (`AFTER_APPROVAL`).
- [IPA signé](https://expo.dev/artifacts/eas/7_C2KCpc7EIHIuJYa6k1sCI5nEm9ALlHKhyismRg648.ipa), également conservé localement dans `build/releases/1.0.3/Molyscan-1.0.3-9.ipa`.
- IPA vérifié : version 1.0.3 / build 9, 20 237 235 octets, SHA-256 `e2c680f56d19137c1d22b314e9b768692b8d3ac3375be73ba35eb0dc53479f3a`.

Apple : **version 1.0.3 / build 9 soumise à 23:45:08 Europe/Paris**, statut de version et de soumission **`WAITING_FOR_REVIEW`**. Elle n'est pas encore déclarée disponible sur l'App Store.

- Build Apple : `85ee93b6-470e-43f6-b1a4-eada388b258c`.
- Soumission Apple : `a3150450-ea9e-4024-95cf-a4a9dd1420cf`.
- Transfert direct par l'API officielle `buildUploads`, terminé et traité avec succès. Aucun second transfert et aucune acceptation de licence Xcode.
- Les informations App Review existantes sont conservées ; les notes décrivent le contrôle serveur de l'option désactivée.

## Sauvegarde et traçabilité

Sauvegarde privée du serveur : `/home/ubuntu/molyscan-backups/20260917-29c594f`. Elle contient l'environnement précédent, la configuration PM2, l'ancien `dist`, le journal de compilation et les preuves d'activation et de vérification. Aucun secret n'est copié dans ce dépôt. La révision serveur précédente était `a32fc395d34300ccfdd3b7b49602c0279f8f17c8`.

La sauvegarde de base et les preuves de la livraison initiale restent décrites dans [PRODUCTION_2026-09-17.md](PRODUCTION_2026-09-17.md). Un retour à l'ancien runtime supprimerait le verrouillage serveur de l'option payante ; privilégier une correction ciblée qui conserve ce verrouillage.
