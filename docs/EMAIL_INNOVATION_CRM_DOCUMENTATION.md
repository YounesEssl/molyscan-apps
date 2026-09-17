Objet : Documentation API Innovation CRM — finalisation de l’intégration Molyscan

Bonjour,

Pour finaliser l’intégration entre Molyscan et Innovation CRM, pourriez-vous nous transmettre la documentation complète de l’API disponible sur l’instance Molydal, idéalement au format Swagger/OpenAPI ou avec une collection Postman et des exemples de requêtes/réponses ?

Nous disposons déjà des informations de connexion, de récupération des sociétés et de création d’une communication. Il nous manque notamment les éléments suivants :

1. **Modification d’une communication existante** : méthode HTTP, URL, corps attendu et réponse. Un POST avec un `comm_communicationid` existant met-il à jour la communication ou faut-il utiliser une autre route ? Comment effacer un champ et relancer un appel après une interruption sans créer de doublon ?
2. **Listes Action et Objectifs** : endpoints permettant de récupérer les valeurs autorisées, champs code/libellé, nom exact du champ Objectif sur une communication et possibilité de sélectionner un ou plusieurs objectifs.
3. **Dates et heures** : confirmation des champs de début et de fin. L’exemple reçu utilise `task_datetime` / `task_todatetime` pour une communication, alors que l’intégration actuelle utilise `comm_datetime` / `comm_todatetime`. Quel fuseau horaire et quel format l’API attend-elle ?
4. **Sociétés, contacts et propriétaire** : règles de rattachement d’une communication, rôle de `comm_personid`, `comm_link` et `comm_userids`, et procédure pour modifier ou retirer une liaison.
5. **Règles générales de l’API** : droits requis, renouvellement du jeton, pagination, filtres, limites d’appels et codes d’erreur, notamment pour distinguer un enregistrement supprimé d’un défaut d’accès.

Pourriez-vous également nous indiquer un environnement de test, ou un jeu de données dédié, permettant de vérifier les créations et modifications sans toucher aux données commerciales réelles ?

La documentation de mise à jour des communications et celle des référentiels Action/Objectifs sont les points prioritaires pour terminer cette livraison.

Merci d’avance pour votre aide.

Bien cordialement,
[Signature]
