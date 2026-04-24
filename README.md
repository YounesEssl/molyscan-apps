# MolyScan

Application mobile B2B pour **Molydal** (lubrifiants industriels). Permet aux commerciaux et distributeurs de photographier un produit concurrent, trouver l'équivalent Molydal via IA, et gérer leur activité terrain — y compris hors ligne.

## Monorepo

```
apps/
  api/     → NestJS REST API (Node.js)
  mobile/  → React Native / Expo
docker/    → Services locaux (PostgreSQL, MinIO, Ollama)
```

## Stack

| Couche | Techno |
|--------|--------|
| Mobile | React Native 0.81, Expo SDK 54, TypeScript strict |
| Routing | Expo Router (file-based) |
| State | Zustand (client) + React Query (serveur) |
| API | NestJS 11, Prisma 6, PostgreSQL 16 + pgvector |
| IA | Claude Sonnet (sélection équivalents), Gemini 2.5 Flash (reformulation), OpenAI text-embedding-3-small (vecteurs) |
| Stockage | MinIO (S3-compatible) |
| Auth | JWT (access 15 min + refresh 7 j) |

## Démarrage rapide

### Prérequis
- Node.js 20+
- Docker Desktop
- Expo CLI (`npm install -g expo-cli`)

### 1. Services locaux
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 2. API
```bash
cp apps/api/.env.example apps/api/.env
# Remplir les clés API (voir section Variables d'environnement)

npm run db:migrate     # Applique les migrations Prisma
npm run db:seed        # Données de démonstration
npm run dev:api        # Lance le serveur sur :3000
```

### 3. Mobile
```bash
cd apps/mobile
npm install
npx expo start         # Dev server
npx expo start --android
npx expo start --ios
```

L'app pointe sur `EXPO_PUBLIC_API_URL` (`.env` dans `apps/mobile/`).

## Variables d'environnement

### API (`apps/api/.env`)

```env
# Base de données
DATABASE_URL=postgresql://molyscan:molyscan_dev@localhost:5432/molyscan?schema=public

# JWT
JWT_SECRET=<secret-fort>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# IA
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
OPENAI_API_KEY=sk-...

# Supabase (vector store)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=molyscan
MINIO_SECRET_KEY=molyscan_dev
MINIO_BUCKET=molyscan
MINIO_USE_SSL=false

# Expo Push
EXPO_PUSH_ACCESS_TOKEN=

# App
PORT=3000
NODE_ENV=development
API_PREFIX=api
```

### Mobile (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL=https://api.molyscan.fr/api   # prod
# EXPO_PUBLIC_API_URL=http://localhost:3000/api    # local
```

## Architecture mobile

```
src/app/          → Écrans (Expo Router)
  (auth)/         → Login / Register
  (tabs)/         → Accueil, Scanner, Historique, Chat, Profil
  chat/[id].tsx   → Conversation IA
  product/[id].tsx→ Fiche produit

src/components/   → Composants UI réutilisables
src/hooks/        → Hooks custom (auth, caméra, localisation…)
src/services/     → Couche API (Axios)
src/stores/       → État global (Zustand)
src/schemas/      → Validation (Zod)
```

Flux de données : `Écran → Hook → Service → Axios → API`

## Architecture API

```
src/auth/         → JWT login/register/refresh
src/chat/         → Conversations IA + RAG (Supabase + Claude)
  rag/            → Reformulation Gemini, vector search, génération Claude
src/scans/        → Scan produits + analyse image (Gemini Vision)
src/products/     → Catalogue produits Molydal
src/workflows/    → Demandes de prix
src/exports/      → Export PDF/CSV/XLSX
src/voice-notes/  → Notes vocales (Whisper)
src/notifications/→ Push Expo
```

## Base de données

PostgreSQL 16 avec extension `pgvector`. Modèles principaux :

- `User` — Commercial / Distributeur / Admin
- `Scan` — Scan d'un produit concurrent avec résultat IA
- `AIConversation` + `AIMessage` — Chat produit ou libre
- `PriceWorkflow` — Demande de prix multi-étapes
- `document_embeddings` — Vecteurs 1536D pour RAG

Migrations : `npm run db:migrate`

## Tests

Voir [docs/TESTS.md](docs/TESTS.md) pour la documentation complète.

```bash
cd apps/api

# Evals RAG avec mocks (rapide, ~55s)
npm run test:eval

# Evals RAG en conditions réelles — vrai Supabase + vrais LLMs (~90s)
npm run test:eval:real
```

## Déploiement VPS

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet.

L'API est accessible sur **https://api.molyscan.fr**.

## Build APK Android

```bash
cd apps/mobile
eas build --platform android --profile preview --non-interactive
```

Profils disponibles dans `apps/mobile/eas.json` :
- `preview` → APK direct install (tests internes)
- `production` → AAB pour le Play Store
