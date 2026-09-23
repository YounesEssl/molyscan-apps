# Identité visuelle Molyscan

## Source et périmètre

Le logo transmis par Axel Bourgeais le 23 septembre 2026 est la référence officielle pour Molyscan. Les fichiers reçus `logo_molyscan_square` et `logo_molyscan_bevel` sont conservés sans modification dans `assets/brand/molyscan/` (SVG et PNG).

Le symbole et le lettrage MOLYDAL appartiennent au logo fourni. Le nom de l'application reste « Molyscan » : il peut apparaître à côté, comme texte distinct. L'ancienne goutte dessinée dans l'application est remplacée par ce logo.

Cette mise à jour ne modifie pas la palette, la typographie, les couleurs d'état ni les autres composants de l'interface.

## Fichiers et usages

| Usage | Fichier | Règle |
| --- | --- | --- |
| Sources officielles | `assets/brand/molyscan/logo_molyscan_{square,bevel}.{svg,png}` | Conserver les fichiers reçus intacts. |
| Icône iOS / icône Android classique | `apps/mobile/assets/icon.png` | Carré opaque de 1 024 px ; le système applique son masque. |
| Premier plan Android adaptatif | `apps/mobile/assets/adaptive-icon.png` | Symbole complet, transparent, centré dans la zone sûre ; fond rouge officiel dans la configuration Expo. |
| Notification Android | `apps/mobile/assets/notification-icon.png` | Masque blanc transparent dérivé des tracés officiels, imposé par le format Android. |
| Écran de démarrage | `apps/mobile/assets/splash-icon.png` | Variante bevel, proportions intactes, sans effet ajouté. |
| Logo dans l'application | `apps/mobile/assets/images/molyscan-logo.png` | Variante bevel ; affichage carré en mode contain. |
| Admin | `apps/admin/public/brand/molyscan-logo.svg` | SVG bevel officiel, utilisé par le composant partagé Brand. |
| Favicon web/admin | `apps/mobile/assets/favicon.png`, `apps/admin/public/favicon.svg` | Variante bevel officielle. |
| Icône Google Play | `apps/mobile/store-assets/branding/google-play-icon.png` | Carré opaque de 512 px. |

Les SVG officiels définissent un fond **#c80632** et un dessin **#f3f4f7**. Les rendus techniques partent de ces SVG pour conserver les mêmes couleurs sur tous les supports. Les PNG reçus sont archivés comme sources ; ils ne sont pas réenregistrés.

## Contraintes

- Ne pas redessiner, recolorer, déformer, tourner ni rogner le logo.
- Ne pas appliquer de dégradé, ombre, opacité ou arrondi supplémentaire au dessin officiel.
- Garder un conteneur carré et afficher l'image entière. La variante bevel possède déjà ses propres angles arrondis.
- Conserver l'espace interne fourni. Pour Android adaptatif, le dessin est réduit uniformément à 66 % du canevas : son cercle extérieur mesure 58,0 % du canevas, à l'intérieur du disque sûr de 66/108 (61,1 %). La réduction est une adaptation technique, pas un nouveau logo.
- Le masque monochrome des notifications est une adaptation technique Android ; ne pas l'utiliser comme nouvelle variante marketing.
- Garder le logo distinct des libellés « Molyscan », « Admin » ou « by Molydal ».

## Génération reproductible

Depuis la racine du dépôt, avec Node.js et `sharp` accessibles :

```sh
node scripts/generate-brand-assets.cjs
```

Le script copie les SVG officiels destinés au web et produit les PNG depuis les tracés originaux. Il ne modifie ni les sources ni les réglages de version Expo. L'icône carrée est explicitement exportée sans canal alpha, les autres rendus conservent la transparence utile.

Les icônes et l'écran de démarrage natifs nécessitent un nouveau build mobile. Les captures d'écran historiques du dossier `apps/mobile/store-assets/ios/` ne sont pas des sources de marque. L'inventaire du 23 septembre 2026 repère l'ancienne goutte dans `iphone-6.5/01-login.png`, `ipad-12.9/01-login-ipad.png` et `iphone-6.9/01-home.png`. Les autres captures de ce dossier ne présentent pas le logo d'application. Les captures historiques sont conservées ; leur prochain renouvellement devra utiliser de vraies captures de la nouvelle version. Ne pas maquiller d'anciennes captures avec un logo superposé.

Le petit fichier historique `apps/mobile/assets/images/molydal-logo.png` (67 px) n'est référencé par aucun écran ni configuration. Il est conservé comme ancien fichier sans usage ; les composants emploient explicitement `molyscan-logo.png`. L'initialisation utilise le seul écran de démarrage configuré dans `apps/mobile/app.json`, sans second logo dessiné en JavaScript.
