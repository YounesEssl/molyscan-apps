# Tests

## Vue d'ensemble

Les tests sont concentrés sur le pipeline RAG (Retrieval-Augmented Generation) du chat IA — la partie la plus critique et la plus difficile à valider manuellement.

Deux niveaux de tests coexistent :

| Commande | Durée | Ce qui est testé |
|----------|-------|------------------|
| `npm run test:eval` | ~55s | Sélection LLM (mocks Supabase) |
| `npm run test:eval:real` | ~90s | Stack complète — vrai Supabase + vrais LLMs |

```bash
cd apps/api

npm run test:eval        # rapide, sans clés Supabase
npm run test:eval:real   # complet, nécessite toutes les clés API
```

## Tests d'évaluation RAG

### Pourquoi ces tests

Le chat IA a présenté des défauts récurrents dans des conversations réelles :
- Mauvaise famille de produits recommandée (huile de coupe au lieu de fluide de montage)
- Équipements automatiques (PULSARLUBE) recommandés à la place de lubrifiants
- Produit correct dans les sources mais pas sélectionné en premier
- Bouton bloqué après un scan, galerie non fonctionnelle sur Android

Ces tests reproduisent les 5 conversations cassées et vérifient que le pipeline produit le bon équivalent.

### Cas de test (`eval.fixtures.ts`)

| Produit concurrent | Équivalent attendu | Ce qui était cassé |
|-------------------|-------------------|--------------------|
| Cimcool P80 | LUB 19 | Identifié comme huile de coupe MQL au lieu de fluide montage |
| Klüber ISOFLEX NBU 15 | TGV 2000 | Produit absent des sources initiales |
| Klüber Paraliq P 68 | USAGOL AL / H 125 AL | PULSARLUBE (équipement) recommandé |
| Bonderite L-FM L67 | MYE 607 AL / MYE 615 AL | MYE 950 recommandé malgré score plus haut |
| RENOFORM DSW 1002 | SOLESTER 77 / SOLESTER 600 | Mal identifié comme vanishing oil |

### `test:eval` — tests avec mocks

**Fichiers** :
- `src/chat/rag/__tests__/eval.fixtures.ts` — cas de test + chunks Supabase simulés
- `src/chat/rag/__tests__/rag.eval.spec.ts` — suite Jest

`dualSearch` est mocké avec des chunks réalistes qui *incluent* le bon produit. Ces tests vérifient que :
- Le **system prompt** sélectionne le bon équivalent même si un produit avec un score plus élevé est présent
- Le **filtre équipements** retire PULSARLUBE, POMPE SÉRIE, KIT DE DISTRIBUTION avant le LLM

Utile pour itérer rapidement sur le system prompt sans appeler Supabase.

### `test:eval:real` — stack complète sans mocks

**Fichiers** :
- `src/chat/rag/__tests__/rag.real-eval.spec.ts`

Aucun mock — appelle la vraie stack :
1. Gemini 2.5 Flash (reformulation de la requête)
2. Supabase + OpenAI embeddings (retrieval vectoriel)
3. Anthropic Claude Sonnet (génération de la réponse)

Le rapport de sortie indique pour chaque cas :
- La requête reformulée par Gemini
- Les sources effectivement retournées par Supabase
- Si le produit attendu est dans les sources (problème de retrieval/CSV) ou dans la réponse (problème de sélection LLM)

```
✅  Cimcool P80 → fluide d'emmanchement (LUB 19)
   Requête reformulée : "fluide emmanchement montage aqueux durites joints caoutchouc"
   Sources DB : LUB 13 EP2, LUB 19, ...
   Trouvé     : LUB 19
```

### Pipeline RAG — ce qui a été corrigé

**Reformulation (Gemini)** — prompt few-shot avec exemples concrets, `thinkingBudget: 0` pour éviter les sorties tronquées. La requête reformulée est aussi injectée dans le contexte Claude pour éviter que le LLM utilise une connaissance incorrecte du produit concurrent.

**Retrieval (Supabase)** — `match_count` passé de 20 à 40, filtre équipements (`isEquipment()` dans `vector-store.service.ts`) pour exclure PULSARLUBE, POMPE SÉRIE, KIT DE DISTRIBUTION, RACCORD, FONTAINE FUT.

**Sélection (Claude)** — system prompt réécrit avec règles métier explicites : APPLICATION identique en priorité 1, NSF H1 non négociable en priorité 2, viscosité ISO en priorité 3. Distinction explicite huile blanche ≠ huile hydraulique, vanishing oil alimentaire ≠ industriel.

**Double message** — bug corrigé dans `chat.service.ts` : l'historique est fetch AVANT la sauvegarde du message user pour éviter qu'il apparaisse deux fois dans l'appel Anthropic.

## Ajouter un nouveau cas de test

1. Ajouter une entrée dans `eval.fixtures.ts` :

```typescript
{
  name: "Nom du produit concurrent → équivalent attendu",
  query: "nom exact tapé par l'utilisateur",
  expectedProducts: ["PRODUIT MOLYDAL 1", "PRODUIT MOLYDAL 2"],
  forbiddenProducts: ["PRODUIT A NE PAS RECOMMANDER"],
  chunks: [
    chunk("PRODUIT MOLYDAL 1", "Famille", "Description technique...", 0.65),
    chunk("MAUVAIS PRODUIT", "Autre famille", "Description...", 0.78),
  ],
}
```

2. Lancer `npm run test:eval` (rapide) pour vérifier la sélection LLM.

3. Lancer `npm run test:eval:real` pour vérifier le retrieval en conditions réelles.

4. Si un cas échoue avec "Absent du vector store" → le produit n'est pas dans Supabase, corriger le CSV et réindexer.

5. Si un cas échoue avec "Mal sélectionné" → ajuster le system prompt dans `rag.service.ts`.

## Pas de tests unitaires / E2E pour l'instant

L'app n'a pas encore de suite Jest standard ni de tests Playwright. Le focus est sur les evals RAG car c'est la logique métier la plus critique.

Pour ajouter des tests unitaires NestJS classiques :
```bash
cd apps/api
npx jest src/auth/auth.service.spec.ts   # exemple
```

La config Jest est déjà en place dans `apps/api/package.json`.
