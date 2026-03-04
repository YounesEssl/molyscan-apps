# MolyScan — Synthese fonctionnelle

> Application mobile B2B pour **Molydal** (lubrifiants industriels).
> Permet aux commerciaux et distributeurs de scanner des produits concurrents, trouver l'equivalent Molydal, demander des prix et gerer leur activite terrain — meme hors ligne.

---

## Table des matieres

- [Roles utilisateurs](#roles-utilisateurs)
- [Authentification](#1-authentification)
- [Dashboard (Accueil)](#2-dashboard-accueil)
- [Scanner](#3-scanner)
- [Historique des scans](#4-historique-des-scans)
- [Assistant IA (Chat)](#5-assistant-ia-chat)
- [Profil](#6-profil)
- [Detail produit](#7-detail-produit)
- [Workflow demande de prix](#8-workflow-demande-de-prix)
- [Notifications](#9-notifications)
- [Export de donnees](#10-export-de-donnees)
- [Notes vocales / CRM](#11-notes-vocales--crm)
- [Capacites transversales](#capacites-transversales)
- [Stack technique](#stack-technique)
- [Etat actuel du projet](#etat-actuel-du-projet)

---

## Roles utilisateurs

L'application repose sur un systeme de **controle d'acces par role (RBAC)** avec trois profils :

| Role           | Scan | Prix | Chat IA | Export | CRM vocal | Analytics | Validation prix |
| -------------- | :--: | :--: | :-----: | :----: | :-------: | :-------: | :-------------: |
| **Commercial** |  ✅  |  ✅  |   ✅    |   ✅   |    ✅     |    ✅     |       ❌        |
| **Distributeur** | ✅ |  ✅  |   ✅    |   ❌   |    ❌     |    ❌     |       ❌        |
| **Admin**      |  ✅  |  ✅  |   ✅    |   ✅   |    ✅     |    ✅     |       ✅        |

---

## Ecrans & Features

### 1. Authentification

| Ecran      | Description                                       | Statut       |
| ---------- | ------------------------------------------------- | ------------ |
| **Login**  | Email / mot de passe, JWT avec refresh automatique | Implemente   |
| **Register** | Inscription utilisateur                         | Placeholder  |

---

### 2. Dashboard (Accueil)

Page d'accueil centralisee avec vue d'ensemble de l'activite.

- **Statistiques** : total scans, produits matches, demandes de prix
- **Actions rapides** contextuelles selon le role :
  - Scanner un produit (CTA principal)
  - Exporter les donnees (Commercial / Admin)
  - Notes vocales CRM (Commercial / Admin)
  - Assistant IA
- **Demandes de prix en attente** (jusqu'a 3 affichees, filtrees par role)
- **Scans recents** en carrousel horizontal
- **Cloche de notifications** avec badge compteur

---

### 3. Scanner

Interface de scan multi-mode avec 3 methodes de saisie :

#### Mode Code-barres / QR (principal)

- Scan temps reel via camera
- Formats supportes : EAN-13, EAN-8, UPC-A, UPC-E, Code128, Code39, QR
- Retour haptique sur scan reussi
- Capture automatique de la geolocalisation
- Cooldown de 2s anti-doublon
- Controle du flash integre
- Bottom sheet de resultat

#### Mode Capture d'etiquette (OCR)

- Interface camera avec overlay de cadrage
- Capture photo de l'etiquette produit
- Reconnaissance OCR (backend a connecter)

#### Mode Saisie vocale

- Reconnaissance vocale pour scanner mains libres
- Fallback pratique en situation terrain

---

### 4. Historique des scans

Consultation et exploration de l'ensemble des scans effectues.

- **Recherche temps reel** par nom de produit, marque ou equivalent Molydal
- **Filtres par statut** : Tous | Matche | Match partiel | Non matche
- **Double vue** :
  - **Liste** : cards avec details du scan
  - **Carte** : visualisation geographique (react-native-maps)
- **Pull-to-refresh**

---

### 5. Assistant IA (Chat)

Chatbot IA contextualise par produit scanne.

- **Liste de conversations** : une conversation par produit
- **Recherche** dans les conversations
- **Ecran de chat** :
  - Historique des messages (utilisateur / assistant)
  - Questions suggerees contextuelles
  - Indicateur de saisie en cours
  - Auto-scroll vers le dernier message
  - Badge "Powered by AI"

---

### 6. Profil

Gestion du compte utilisateur et des preferences.

- **En-tete** : avatar (initiales), nom, role, entreprise
- **Statistiques personnelles** : total scans, matches, taux de match (%)
- **Informations** : email, telephone, entreprise
- **Preferences** :
  - Toggle notifications
  - Toggle mode offline manuel
- **File de synchronisation** : compteur d'actions en attente
- **Raccourcis** selon le role (Export, Notes vocales)
- **A propos** : version, mentions legales
- **Deconnexion**

---

### 7. Detail produit

Vue approfondie d'un produit scanne avec son equivalence Molydal.

- **Metadonnees du scan** : date, localisation, methode de scan
- **Carte de correspondance** : produit scanne vs equivalent Molydal
- **Score de confiance** (0-100%) avec indicateur visuel
- **Etat sans correspondance** : banniere d'alerte si aucun equivalent
- **Actions** (filtrees par role) :
  - Demander un prix → workflow
  - Poser une question a l'IA → chat
  - Fiche technique → modal detaillee
  - Partager (placeholder)

---

### 8. Workflow demande de prix

Processus de demande et suivi de prix pour un produit Molydal.

#### Creation de la demande

- Affichage des infos produit (lecture seule)
- Champs : nom du client, quantite, prix souhaite (optionnel)
- Soumission avec etat de chargement

#### Suivi du workflow (`workflow/[id]`)

- **Timeline** des etapes avec statuts
- Informations client, quantite, prix demande / approuve
- Actions de validation admin (prevu, pas encore construit)

#### Statuts possibles

`pending` → `quoted` → `approved` / `rejected`

---

### 9. Notifications

Centre de notifications centralise.

| Type               | Description                        |
| ------------------ | ---------------------------------- |
| `scan_match`       | Correspondance trouvee             |
| `price_approved`   | Prix valide                        |
| `price_rejected`   | Prix refuse                        |
| `ai_response`      | Reponse de l'assistant IA          |
| `workflow_update`  | Mise a jour du workflow            |
| `system`           | Notification systeme               |

- Marquer lu (individuel ou tout marquer)
- Badge compteur de non-lus
- Etat vide avec message

---

### 10. Export de donnees

> Accessible uniquement aux roles **Commercial** et **Admin**.

- **Formats disponibles** : PDF, Excel (XLSX), CSV
- **Filtrage** :
  - Par statut (Tous, Matche, Partiel, Non matche)
  - Par marques (selection multiple)
- **Previsualisation** des donnees (3 enregistrements par defaut, extensible a 20)
- **Generation** avec etat de chargement
- **Historique des exports** : nom, taille, date, bouton de telechargement

---

### 11. Notes vocales / CRM

> Accessible uniquement aux roles **Commercial** et **Admin**.

Outil de prise de notes vocales terrain avec extraction automatique de donnees CRM.

#### Liste des notes

- Bouton nouvelle note
- Cards : nom client, duree, apercu de transcription, tags, date

#### Enregistrement (workflow en 3 phases)

1. **Enregistrement** :
   - Timer (MM:SS), indicateur d'enregistrement
   - Bouton micro (88px), visualisation d'onde sonore
2. **Transcription** :
   - Transcription automatique du contenu audio
3. **Relecture & edition** :
   - Texte de transcription editable
   - **Champs CRM extraits automatiquement** :
     - Nom du client
     - Nom du contact
     - Produit mentionne
     - Prochaine action
   - **Tags auto-detectes** : `prospect-chaud`, `devis`, `hydraulique`, `graisses`, `contrat`, `urgent`, `salon`, `logistique`
   - Boutons : Sauvegarder / Re-enregistrer

---

## Capacites transversales

### Mode offline

- Base de donnees locale **SQLite** (expo-sqlite)
- File d'attente de synchronisation des actions
- Re-synchronisation automatique a la reconnexion
- Toggle manuel du mode offline dans le profil
- Banniere visuelle quand hors ligne
- Barre de progression de synchronisation

### Geolocalisation

- Capture automatique des coordonnees GPS sur chaque scan
- Visualisation sur carte dans l'historique

### Internationalisation (i18n)

- Langues supportees : **Francais** (par defaut) et **Anglais**
- Gestion via i18next + react-i18next

### Notifications push

- Configuration Expo Notifications
- Enregistrement du token push aupres du backend

### Retour haptique

- Vibration sur scan reussi (expo-haptics)

### Design system

- **Couleurs Molydal** : primaire `#1B3A5C` (bleu fonce), accent `#E87722` (orange)
- Tokens : couleurs, espacements, typographie, rayons, ombres
- Composants UI reutilisables : Button, Text, Card, Badge, Input, Avatar, BottomSheet, Toggle, ProgressBar, EmptyState, StatusIndicator

---

## Stack technique

| Categorie         | Technologies                                          |
| ----------------- | ----------------------------------------------------- |
| **Runtime**       | Expo SDK 54, React 19.1, React Native 0.81.5          |
| **Langage**       | TypeScript (strict mode)                               |
| **Routing**       | Expo Router (file-based)                               |
| **State**         | Zustand (client) + React Query (serveur)               |
| **API**           | Axios avec JWT auto-inject + refresh token             |
| **Validation**    | Zod                                                    |
| **Base locale**   | expo-sqlite                                            |
| **Stockage securise** | expo-secure-store (JWT)                           |
| **Camera**        | expo-camera (scan code-barres)                         |
| **Audio**         | expo-audio (enregistrement vocal)                      |
| **Localisation**  | expo-location                                          |
| **Cartes**        | react-native-maps                                      |
| **Haptics**       | expo-haptics                                           |
| **Notifications** | expo-notifications                                     |
| **i18n**          | i18next + react-i18next                                |
| **UI**            | Expo Linear Gradient, Ionicons, Lucide React Native    |

### Permissions appareil requises

- Camera (scan code-barres / etiquettes)
- Microphone (notes vocales)
- Localisation (geolocalisation des scans)
- Notifications (push)
- Stockage securise (tokens JWT)

---

## Etat actuel du projet

### Implemente (UI complete, donnees mock)

- Authentification (login/logout, JWT avec refresh)
- Dashboard avec raccourcis par role
- Scan code-barres/QR avec haptics et flash
- Historique des scans (recherche, filtres, vue carte)
- Detail produit avec score de confiance
- Creation de demande de prix
- Chat IA (liste et detail des conversations)
- Centre de notifications
- Profil utilisateur avec statistiques et preferences
- Enregistrement vocal avec extraction CRM
- Export de donnees (PDF/Excel/CSV)
- Mode offline avec file de synchronisation
- Localisation FR/EN
- Push notifications (hook)
- Geolocalisation sur scan

### A connecter / Finaliser

| Feature                          | Etat                                              |
| -------------------------------- | ------------------------------------------------- |
| API backend                      | Endpoints definis, aucun appel reel                |
| OCR etiquettes                   | Interface camera prete, backend OCR a connecter    |
| Transcription vocale             | Simulee (delai 2s + mock), a brancher sur un STT   |
| Validation admin des prix        | Role defini, UI d'action a construire              |
| Dashboard analytics              | Role prevu, ecran non cree                         |
| Inscription                      | UI basique, pas de flux backend                    |
| Partage produit                  | Bouton placeholder                                 |

---

> **En resume** : l'application est un **shell complet et fonctionnel** avec l'ensemble des ecrans construits sur des donnees mock, pret pour l'integration avec un backend reel.
