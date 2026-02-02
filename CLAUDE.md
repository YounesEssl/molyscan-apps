# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npx expo start          # Start dev server
npx expo start --ios    # Run on iOS simulator
npx expo start --android # Run on Android emulator
npx expo start --web    # Run in browser
```

No test runner or linter is configured yet. Formatting uses Prettier (config in `.prettierrc`).

## Architecture

**MolyScan** — React Native barcode scanning app for Molydal (industrial lubricants). Built with **Expo SDK 54** and **TypeScript (strict mode)**.

**Routing**: Expo Router (file-based) in `src/app/`. Route groups:
- `(auth)` — login/register
- `(tabs)` — four tabs: Accueil, Scanner, Historique, Profil
- `product/[id]` — product detail screen (stack)

**State management**: Zustand stores in `src/stores/` for client state (auth, scanner). React Query (`@tanstack/react-query`) for server state, configured in `src/lib/queryClient.ts`.

**API layer**: Axios instance in `src/lib/axios.ts` with automatic JWT injection from `expo-secure-store` and 401 token refresh logic. Base URL from `EXPO_PUBLIC_API_URL` env var (defaults to `http://localhost:3000/api`). API endpoints defined in `src/constants/api.ts`.

**Data flow**: Screen → Hook (`src/hooks/`) → Zustand store + Service (`src/services/`) → Axios → Backend. All API responses validated with Zod schemas (`src/schemas/`).

**Mock data**: All screens currently use mock data from `src/mocks/`. No real API calls yet.

**Path alias**: `@/*` maps to `src/*` (configured in tsconfig.json).

## Key Conventions

- UI is in French (tab labels: "Accueil", "Scanner", "Historique", "Profil")
- Design tokens in `src/constants/theme.ts` (COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW)
- `src/constants/colors.ts` re-exports from theme.ts for backwards compat
- Reusable UI components in `src/components/ui/` (Button, Text, Card, Badge, Input, Avatar, BottomSheet)
- Domain components organized by feature: `scanner/`, `product/`, `history/`, `dashboard/`
- `ScreenWrapper` provides SafeAreaView + optional scroll + padding
- Expo New Architecture is enabled
- Molydal brand colors: primary=#1B3A5C (dark blue), accent=#E87722 (orange)
