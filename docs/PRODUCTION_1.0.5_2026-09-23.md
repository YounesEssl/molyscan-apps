# Livraison 1.0.5 — logo officiel et exclusion des archives PIM

Demande de Younes à partir des mails d'Axel Bourgeais du 23 septembre 2026, « Logo MOLYSCAN + récupération PIM ». Le logo est déployé sur l'administration et inclus dans les binaires mobiles soumis aux stores. La base **ARCHIVES PRODUITS** est exclue du catalogue Molyscan. Aucun déplacement ni suppression n'a été effectué par Molyscan dans Sellbase, aucun mail n'a été envoyé.

## Logo officiel

Les variantes SVG et PNG reçues sont conservées intactes dans `assets/brand/molyscan/`. Les exports techniques sont reproductibles avec `scripts/generate-brand-assets.cjs` ; les règles et la provenance figurent dans [brand-guidelines.md](brand-guidelines.md).

- Mobile : icône native, écran de démarrage, logo des écrans, favicon, premier plan adaptatif Android et masque de notification.
- Admin : connexion, récupération de mot de passe, navigation, confidentialité et favicon.
- Google Play : icône officielle 512 × 512 soumise avec cette livraison.
- Pas de changement de palette globale ni de recréation approximative du logo.

Source mobile : **`db76220accb308ffa43720c93a09723478d5ed16`**, version **1.0.5**, build iOS **11**, versionCode Android **34**. Les corrections de la version 1.0.4 sont incluses. Les corrections du catalogue sont livrées séparément côté API, sans nouveau binaire nécessaire.

## Archives PIM

Le premier mail désignait le dossier **ARCHIVAGE PRODUITS** de la base principale : niveau 2, élément **25012891**, instance **59727**. Axel l'a ensuite déplacé vers une nouvelle base, puis a précisé sa demande par mail à **08:19 UTC**. L'API confirme le déplacement à **10:16:36 Europe/Paris**.

Périmètre final : base principale **0**, base exclue **87584**, élément de publication **25014121**, libellé **ARCHIVES PRODUITS**. Le filtre du dossier historique est conservé ; sélectionner la base d'archives comme source est également interdit pour le tenant Molydal.

La base d'archives contient 141 produits et 349 références. **AIR S22 AL** conserve aussi un rangement actif dans la base principale avec trois références : il reste donc disponible. Une occurrence dans la base exclue ne bloque pas automatiquement une occurrence toujours active dans la base principale.

Avant intervention : **470 produits**, **1 512 références**, **427 produits dans l'index IA**. Après synchronisation : **330 produits**, **1 163 références**, **289 produits dans l'index IA**, soit **140 produits et 349 références retirés**. Les lignes locales sont désactivées, sans suppression ; l'ancien index est archivé.

Le premier contrôle attendait 329/1 160/288 d'après le snapshot antérieur au déplacement effectué par Axel. Son écart a été expliqué par cette modification de la source ; une vérification en lecture seule du périmètre final a ensuite réussi. Aucune seconde synchronisation n'a été lancée pour corriger artificiellement cet écart.

Les équivalences expertes restent conservées. KL BIO, KL 111 et H 128 conservent des fiches homonymes actives. Trois décisions visant **STARNET** deviennent inéligibles pour de nouvelles recommandations ; **STARNET+** reste distinct et actif. Les anciens scans et conversations ne sont pas réécrits. Voir [PIM_RAG.md](PIM_RAG.md).

## Vérifications et production

API : **`d3b853e9a46b3d11da95377be35f035c4f5df071`**, activée à **09:43:53 UTC**. API et administration vérifiées publiquement à **09:44:13 UTC** ; les assets servis correspondent aux fichiers construits. Aucune migration ni modification des dépendances.

Sauvegardes privées sur le VPS : `/home/ubuntu/molyscan-backups/20260923-6c03248` avant la synchronisation et `/home/ubuntu/molyscan-backups/20260923-d3b853e` avant le verrou final. Chaque sauvegarde contient notamment le dump PostgreSQL vérifié, la configuration et l'ancien exécutable API. Une restauration éventuelle doit préserver les écritures utilisateur intervenues depuis.

Synchronisation **`c050fbb9-8a8d-4b62-8b0f-92a3091fc4d8`**, terminée à **08:35:18 UTC**. Index actif **`77f1b89d-7d4c-4a8f-953c-726f7cd21890`**. Vérifications réussies : aucun produit/référence exclu encore actif, aucun produit exclu dans l'index actif, aucune référence active rattachée à un produit inactif, tous les IDs conservés présents.

**171 tests / 11 suites**, compilation API locale et Linux, compilation admin, TypeScript mobile et configuration Expo réussis. Icône iOS opaque 1 024 px, zone sûre Android, masque de notification et rendu desktop de l'administration vérifiés. Aucun contrôle téléphone ou simulateur.

L'édition des notes CRM depuis l'historique reste **désactivée**, confirmé par l'API `/features`. Aucun changement du réglage commercial.

Preuves locales : `build/releases/1.0.5/activation-complete.json`, `pim-sync-verification.json`, `pim-scope-ids.json`, `pim-scope-ids-initial.json`, `public-verification.json`.

## Distribution mobile

Les deux versions sont soumises et **ne sont pas encore annoncées comme publiées** :

- Apple : **1.0.5 (11)**, `WAITING_FOR_REVIEW`, publication après approbation. Build EAS `8ffd918c-7c8e-4b5b-8fd5-e3f9cecc2fbd`, build Apple `4f9764b7-1cf0-4e22-8c35-b3064a14daa4`, revue `962f576b-23d3-4ef8-9f11-798040779b77`, soumise à **08:37:07 UTC**. La soumission 1.0.4 a été retirée pour être remplacée ; 1.0.3 publiée reste disponible.
- Google Play : **1.0.5 (34)**, release **9**, `IN_REVIEW`, déploiement 100 % après approbation, publication gérée désactivée. L'icône officielle est incluse. La version 1.0.4 (33) reste disponible pendant la revue.

Artifacts dans `build/releases/1.0.5/` :

| Fichier | SHA-256 |
| --- | --- |
| `Molyscan-1.0.5-11.ipa` | `096d7581805a78b11f9b43bb471998b32ac4ae0825f4f0a8174023659f7502ce` |
| `Molyscan-1.0.5-34-production.aab` | `fe83df1c0603a8fb868fecac617bc603e75bf461db0c9bded9b4ff5dd959168d` |
| `Molyscan-1.0.5-34-production.apk` | `cfa899d8f43e0d51475b1a99f19268e286237f10ef03aa3c1ef726e37065f744` |

Les captures iPhone existantes montrent les écrans scan, assistant, historique, scanner et note sans l'ancien logo. Une capture iPad historique de connexion présente encore l'ancienne goutte ; elle est conservée, l'application étant configurée `supportsTablet=false` et Younes prenant en charge la recette sur appareils. Aucune capture retouchée pour simuler le nouveau logo. Aucune licence Xcode acceptée ; aucun changement de signature.

## Précision ultérieure de Claire — filtre ERP à compléter

Mail de Claire COLLET reçu à **09:18:29 UTC**, puis vérification Sellbase en lecture seule à **09:44:27 UTC** : la caractéristique **1393**, libellée **« Est en sommeil ? »**, est numérique, issue des données principales. Claire précise **0 = active**, **1 = en sommeil**, alimenté par l'ERP. Les valeurs renseignées observées sont bien uniquement 0 et 1.

Parmi les 1 163 références retenues : **965 à 0, 144 à 1, 54 sans valeur**. Parmi les 349 références archivées : **6 à 0, 336 à 1, 7 sans valeur**. Le filtre ERP complète donc l'exclusion de la base ; il ne doit pas la remplacer. Parmi les 330 produits retenus : 282 ont au moins une référence à 0, 27 n'ont que des références à 1, 13 n'ont que des statuts manquants, 7 n'ont pas de référence et KLS 240 mélange 1 et valeur manquante.

Le code actuel stocke déjà ce champ dans `erpStatus` (avec repli sur 1083), mais ne l'applique pas encore à `active`. **Cette livraison applique l'exclusion des archives uniquement ; le filtre de sommeil reste à ajouter.** La question de Younes portait sur la confirmation de l'information : aucune nouvelle règle de statut n'a été déployée sans définir le traitement des valeurs manquantes. Cette évolution est côté serveur et ne nécessite pas de reconstruire les applications.
