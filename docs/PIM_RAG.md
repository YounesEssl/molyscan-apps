# PIM-backed RAG

Molyscan treats Sellbase as the sole source of truth for Molydal product data.
The legacy Supabase `product_chunks` index is used only until the first validated
PIM index is activated.

## Synchronization

- Manual: Admin → **PIM & RAG** → **Synchroniser maintenant**.
- Automatic: first day of every month at 03:00 Europe/Paris.
- Sellbase publication `52903` defines scope: level 4 products, level 5 references.
- Master values are read from `baseId=0`; publication overrides from `baseId=52903`.
- Calls are batched by 100 to remain far below Sellbase rate limits.
- Missing published products are deactivated, never immediately deleted.
- Every product is hashed. Unchanged chunks reuse the previous embedding.

## Index safety

Each run builds a separate `RagIndexVersion`. The active version is only changed
inside a database transaction after structural validation. Previous versions are
archived and retained for rollback. Query and document embeddings share the same
`RAG_EMBEDDING_MODEL` and `RAG_EMBEDDING_DIMENSIONS` configuration.

## Documents

Document metadata is synchronized from Sellbase. Mobile clients list documents
through `/products/pim/by-name/:name/documents` and read PDF content through the
authenticated Molyscan proxy. Technical sheets use the public Molydal PDF
endpoint associated with the Sellbase product instance. `SELLBASE_MEDIA_BASE_URL`
is only needed for certificates and secondary files once Sellbase confirms that
media origin.

## Deployment

1. Configure all `SELLBASE_*` and `RAG_EMBEDDING_*` variables.
2. Deploy the Prisma migration.
3. Deploy API and admin.
4. Run the first synchronization manually and monitor its admin history.
5. Verify the active index before retiring the legacy Supabase store.
