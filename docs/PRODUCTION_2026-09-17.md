# Livraison en production — 17 septembre 2026

Déploiement demandé par Younes après la recette. Les vérifications sur téléphone sont laissées à Younes, conformément à sa demande.

## Versions

- Code applicatif : `1944160b824d867264672e4c2e60fa27c647ebae`.
- Packaging EAS : `648c2fb` ; seules les exclusions `.easignore` changent, sans modification du code applicatif.
- Mobile : version `1.0.2`, build iOS `8`, versionCode Android `31`. Nouveaux binaires natifs, sans publication OTA.

## Serveur et admin

- API activée le 17 septembre à **16:19:31 Europe/Paris** ; processus PM2 sauvegardé pour le redémarrage du serveur.
- Admin activé à **16:19:54 Europe/Paris**. Les nouveaux assets sont copiés avant le remplacement atomique de `index.html` ; les anciens assets restent disponibles pour les sessions déjà ouvertes.
- Compilation Linux de l'API réussie avant les migrations et l'activation. Dépendances installées depuis le lockfile ; client Prisma régénéré.
- Nginx : `proxy_read_timeout` porté de 120 à 180 secondes ; configuration validée et rechargée.
- Configuration CRM de production et clé de chiffrement conservées. Fuseau effectif : `Europe/Paris`. Le tenant PIM `c_molydal` utilise la source publique des FDS sans nouvelle clé média.
- Référentiel des départements mis à jour par le seed dédié ; les préférences existantes de notification sont conservées sauf valeur explicitement définie dans le référentiel. Aucun seed de démonstration exécuté.

Les cinq migrations suivantes sont appliquées et terminées :

1. `20260715120000_department_email_notification_opt_out`
2. `20260916100000_expert_no_equivalent`
3. `20260916100000_voice_note_crm_fields`
4. `20260917100000_voice_note_edit_sync`
5. `20260917140000_voice_note_objectives_list`

La passe publique du **17 septembre à 16:20:40 Europe/Paris** confirme :

- `/api/health` : HTTP 200, base de données disponible.
- Admin `/` et `/index.html` : HTTP 200, contenu identique au build local.
- JS `index-C3lQUvu7.js` et CSS `index-DMR5oM-1.css` : HTTP 200, SHA-256 identiques au build local.
- Routes de veille, documents PIM et modification de note : HTTP 401 sans authentification, comme attendu. Ces requêtes n'ont modifié aucune donnée.

SHA-256 de l'index admin : `23efb8e38bd59ec8f1c323a9f9ff7955df230409199aadddbfca8dc056468793`.

## Catalogue PIM et recherche

Synchronisation terminée à **16:21:02 Europe/Paris**, exécution `a771ff7a-9504-49aa-8080-4fd9196cef63` : **194 produits**, **485 références**, **161 blocs de recherche**, **5 contrôles de recherche réussis sur 5**. Les nouvelles règles de normalisation ont mis à jour 188 produits.

Le nouvel index `5fa8a278-825a-4411-99f7-a105e5484ee3` est actif. La bascule transactionnelle a archivé l'ancien index `2c862625-2560-45b9-a46a-74e16e0b9032`, qui reste conservé.

Après synchronisation, le service compilé de production a téléchargé réellement la FT et la FDS françaises d'AGL 41 NF, respectivement **81 908** et **175 729 octets**, avec signature `%PDF-` valide. Cette vérification porte sur le service de documents déployé, sans interaction avec un téléphone ni écriture CRM.

## Distribution mobile

Builds EAS :

- iOS : `ab481053-64a2-4acd-90d3-2772a7e54e83`.
- Android AAB : `7d106035-0d9c-4e24-8448-b3a0f8970dab`.
- Android APK : `f2a29b87-7b73-4623-b65e-a94ef9a56c44`.

Statut au moment de la rédaction : builds en cours ; les fiches de version sont préparées, sans soumission finale. Une version envoyée aux stores ne devient disponible qu'après les étapes de traitement et de validation propres à chaque plateforme.

## Sauvegarde et incident de déploiement

Sauvegarde conservée uniquement sur le VPS dans `/home/ubuntu/molyscan-backups/20260917-1944160`, répertoire privé : dump PostgreSQL vérifié, environnement API, configuration Nginx, PM2, ancien build API et ancienne version de l'admin. Les anciennes dépendances et le répertoire `dist` sont également conservés. La révision précédente était `4be789e`.

Le premier contrôle automatique de santé attendait `status` à la racine, alors que l'API renvoie `data.status`. Il a déclenché un retour automatique à l'ancien runtime malgré une API saine. Le contrôle a été corrigé, puis l'activation relancée avec succès. Les migrations additives ont été conservées pendant ce retour arrière ; aucune restauration de la base n'a été effectuée.

Ne pas restaurer aveuglément le dump après de nouvelles écritures utilisateurs. Privilégier une correction ciblée ; l'ancien runtime ne connaît pas les nouvelles décisions sans équivalent ni toutes les protections du renvoi CRM.

## Limites de recette

Les **262 tests API** et **48 tests mobiles**, ainsi que les contrôles antérieurs, sont détaillés dans [RECETTE_2026-09-17.md](RECETTE_2026-09-17.md) et [TESTS.md](TESTS.md). Aucun nouveau contrôle sur téléphone n'a été lancé pour le déploiement. Les trois cas métier d'équivalence restant à qualifier sont détaillés dans [DELIVERY_2026-09-16.md](DELIVERY_2026-09-16.md).

Aucune communication, société ni contact client n'a été modifié dans Innovation CRM pendant le déploiement.
