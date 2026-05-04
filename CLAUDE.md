# CLAUDE.md

Guidance pour Claude Code quand il travaille dans ce repo.

## Commandes utiles

### Développement local

```bash
# Services (PostgreSQL, MinIO, Ollama)
docker compose -f docker/docker-compose.yml up -d

# API (port 3000)
npm run dev:api

# Mobile (Expo)
npm run dev:mobile
# ou directement :
cd apps/mobile && npx expo start --android
```

### Base de données

```bash
npm run db:migrate    # prisma migrate dev
npm run db:seed       # ts-node prisma/seed.ts
npm run db:studio     # Prisma Studio UI
npm run db:generate   # regenerate Prisma client
```

### Build

```bash
npm run build:api                               # Compile NestJS → dist/
cd apps/mobile && eas build --platform android --profile preview   # APK
```

### Tests RAG (IA)

```bash
cd apps/api
npm run test:eval          # ~55s — mocks Supabase, teste la sélection LLM
npm run test:eval:real     # ~90s — vrai Supabase + vrais LLMs (nécessite toutes les clés)
```

Voir [docs/TESTS.md](docs/TESTS.md) pour la documentation complète.

### Déploiement VPS

```bash
# Depuis le poste local
git push origin main

# Sur le VPS (api.molyscan.fr)
cd ~/molyscan-apps && git pull origin main
cd apps/api && npm install && npm run build
npx prisma migrate deploy
pm2 restart molyscan-api
```

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet.

---

## Architecture

**MolyScan** — Application mobile B2B pour Molydal (lubrifiants industriels). Les commerciaux photographient un produit concurrent et l'IA identifie l'équivalent Molydal.

### Monorepo

```
apps/api/     → NestJS 11 REST API
apps/mobile/  → React Native / Expo SDK 54
docker/       → Services locaux (Postgres, MinIO, Ollama)
docs/         → Documentation (déploiement, tests)
```

### Mobile

**Routing** : Expo Router (file-based) dans `src/app/`
- `(auth)/` — login / register
- `(tabs)/` — Home, History, Scanner, AI Assistant, Profile
- `product/[id]` — fiche produit (stack)
- `chat/[id]` — conversation IA (stack)
- `workflow/[id]` + `workflow/price-request` — demande de prix
- `voice-note/` — record + index notes vocales
- `export/` — exports PDF / CSV / XLSX
- `notifications` — centre de notifications

**State** : Zustand (`src/stores/`) pour l'état client. React Query pour le serveur (`src/lib/queryClient.ts`).

**API layer** : Axios (`src/lib/axios.ts`) avec injection JWT automatique depuis `expo-secure-store` et refresh token sur 401. Base URL : `EXPO_PUBLIC_API_URL` (`.env`).

**Flux** : `Écran → Hook (src/hooks/) → Service (src/services/) → Axios → API`

**Validation** : Zod schemas dans `src/schemas/` sur toutes les réponses API.

**Path alias** : `@/*` → `src/*`

### API

Modules NestJS :

| Module | Responsabilité |
|--------|---------------|
| `auth` | JWT login/register/refresh, bcrypt |
| `users` | Profil utilisateur, gestion compte |
| `chat` | Conversations IA libres et produit, SSE streaming |
| `chat/rag` | Pipeline RAG : reformulation Gemini → Supabase vector search → Claude |
| `scans` | Scan produits, analyse image Gemini Vision |
| `products` | Catalogue Molydal |
| `workflows` | Demandes de prix multi-étapes |
| `exports` | PDF / CSV / XLSX |
| `voice-notes` | Notes vocales, transcription Whisper |
| `ocr` | Extraction texte depuis images (étiquettes produits) |
| `storage` | Upload S3/MinIO, URLs signées |
| `notifications` | Push Expo |

### Pipeline RAG (chat IA)

```
Question utilisateur
  ↓
Gemini 2.5 Flash — reformulation (few-shot, thinkingBudget=0)
  ↓
OpenAI text-embedding-3-small — embedding de la question + reformulation
  ↓
Supabase RPC search_chunks — dual search (match_count=40), filtre équipements
  ↓
Claude Sonnet 4.6 — sélection et réponse (system prompt avec règles métier)
```

Règles de sélection (ordre de priorité) :
1. APPLICATION identique (fluide montage ≠ huile de coupe)
2. Certification NSF H1 non négociable si concurrent alimentaire
3. Viscosité ISO
4. Base huile

---

## Conventions

- UI en anglais (labels tabs : "Home", "History", "AI Assistant", "Profile") — i18n via `react-i18next` (`src/i18n/`)
- Design tokens dans `src/design/tokens/` (colors, spacing, radius, shadows, typography)
- `src/constants/colors.ts` ré-exporte depuis tokens pour compatibilité
- Composants UI dans `src/components/ui/` : Button, Text, Card, Badge, Input, Avatar, BottomSheet, IconButton, Pill, ProgressBar, Ring, ScoreIndicator, SearchBar, StatusIndicator, Toggle, Wordmark, Aura, EmptyState
- Composants domaine par feature : `scanner/`, `product/`, `history/`, `dashboard/`, `chat/`, `workflow/`, `notifications/`, `profile/`, `layout/`
- Icônes : `react-native-solar-icons` (bold + bold-duotone) et `lucide-react-native` en complément
- `ScreenWrapper` = SafeAreaView + scroll optionnel + padding
- Nouvelle Architecture Expo activée (`newArchEnabled: true`)
- Couleurs Molydal : primary `#1B3A5C` (bleu marine), accent `#E87722` (orange)

## Fichiers clés

```
apps/api/src/chat/rag/rag.service.ts          → System prompt + reformulation Gemini
apps/api/src/chat/rag/vector-store.service.ts → Dual search, filtre équipements
apps/api/src/chat/chat.service.ts             → Gestion conversations et messages
apps/api/src/scans/image-analysis.service.ts  → Analyse photo Gemini Vision
apps/mobile/src/app/(tabs)/scanner.tsx        → Écran scanner (capture + galerie)
apps/mobile/src/app/(tabs)/chat.tsx           → Onglet chat
apps/mobile/src/app/chat/[id].tsx             → Conversation IA détaillée
apps/api/prisma/schema.prisma                 → Schéma base de données
```
