# Notifications des scans aux responsables de secteur

Les nouveaux scans effectués par un compte distributeur approuvé sont transmis par e-mail aux utilisateurs Molydal approuvés (rôle commercial ou administrateur) **explicitement rattachés au même département**. Plusieurs responsables d'un même secteur reçoivent chacun le message. Les administrateurs sans rattachement ne sont pas ajoutés comme destinataires.

Le message contient l'auteur du scan, sa société si elle est renseignée, le secteur, le produit identifié, les équivalents proposés et l'analyse effectivement enregistrée. Le secteur « Reste du monde » est exclu à la demande de Guillaume. Les départements avec `emailNotificationsDisabled` sont exclus, comme pour les autres notifications par e-mail de l'application.

Seuls les scans créés après la migration sont éligibles. La notification est enregistrée dans la ligne du scan ; l'échec du fournisseur n'empêche pas l'affichage du résultat dans l'application. Un traitement relance les envois en attente chaque minute pendant 23 heures. Les destinataires et le contenu sont figés avant le premier essai. La clé d'idempotence Resend dérive de l'identifiant du scan afin qu'une relance ne crée pas de second e-mail. Les notifications toujours en attente après 23 heures sont signalées dans les logs à 8 h, heure de Paris.

## Contrôles d'exploitation

- Vérifier `RESEND_API_KEY` et `RESEND_FROM_EMAIL` sur le serveur, sans afficher leurs valeurs.
- Vérifier que les comptes distributeurs et les responsables Molydal approuvés ont leurs départements correctement attribués. Sans destinataire rattaché, aucun e-mail n'est envoyé pour ce scan et un avertissement est journalisé.
- Suivre les avertissements et erreurs de `ScanEmailNotificationService` et `EmailService` dans les logs PM2.
- Contrôler dans la table `scans` les colonnes `scanEmailPending`, `scanEmailAttemptCount`, `scanEmailNextAttemptAt` et `scanEmailSentAt` pour diagnostiquer un envoi. Ne pas remettre `scanEmailPending` à `true` sur les anciens scans : cela provoquerait des notifications rétroactives.
