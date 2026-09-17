# Activation de l'édition CRM depuis l'historique

La modification des notes déjà enregistrées et le renvoi de leurs modifications au CRM sont une option payante. Elles sont **désactivées par défaut** et conservées dans les binaires pour pouvoir être activées plus tard sans nouvelle compilation mobile.

## Contrôle côté serveur

Le réglage `CRM_HISTORY_EDITING_ENABLED` appartient à l'exploitant. Aucun endpoint ni bouton d'administration client ne permet de le changer. Une valeur absente, invalide ou différente de `true` désactive l'option (espaces et casse sont normalisés).

- `GET /api/features`, authentifié et sans cache HTTP, expose `crmHistoryEditingEnabled`.
- L'application garde l'édition désactivée tant qu'elle n'a pas reçu une autorisation valide du serveur. Elle relit ce réglage à la reprise et au retour sur les écrans concernés.
- `PATCH /api/voice-notes/:id` est refusé par l'API quand l'option est désactivée, y compris depuis une ancienne version de l'application.
- Le renvoi d'une note modifiée (`revision != 0`) est également refusé avant toute prise de verrou ou communication avec le CRM.
- La création de notes et les reprises du premier envoi non modifié restent disponibles. L'historique reste consultable.
- L'erreur correspondante est HTTP 403 avec `code: CRM_HISTORY_EDITING_DISABLED`.

## Activer ou désactiver ultérieurement

Sur le VPS, modifier le réglage dans `/home/ubuntu/molyscan-apps/apps/api/.env`, puis recharger le processus avec la même valeur. La variable passée à PM2 évite qu'une ancienne valeur de son environnement prenne priorité sur le fichier `.env`.

Activation après accord commercial :

```dotenv
CRM_HISTORY_EDITING_ENABLED=true
```

```bash
CRM_HISTORY_EDITING_ENABLED=true pm2 restart molyscan-api --update-env
pm2 save
```

Désactivation :

```dotenv
CRM_HISTORY_EDITING_ENABLED=false
```

```bash
CRM_HISTORY_EDITING_ENABLED=false pm2 restart molyscan-api --update-env
pm2 save
```

Ces opérations ne nécessitent ni build mobile ni republication sur les stores. Le redémarrage de l'API recharge sa configuration ; l'application récupère ensuite le nouveau réglage. Ne pas activer l'option en production uniquement pour la tester avant l'accord commercial.

Les anciens binaires 1.0.2 ne savent pas masquer leur bouton d'édition, mais le verrouillage serveur bloque leurs modifications. Les binaires à partir de 1.0.3 masquent aussi les contrôles et ferment l'accès direct au formulaire d'édition quand l'option est désactivée.
