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

Certification metadata is derived from explicit PIM logo/certificate categories
(`1373`, `1380`, `1378`, `1124`, `47`) and official descriptions. Production logo
filenames such as `NFC_Mark_H1_BLUE.jpg` identify NSF H1; the analogous `A1`, `K1`
and `3H` files retain their own category. `nsf_categories` contains **only NSF**
categories. A 2probity H1 claim is recorded separately in `certifications` with its
issuer and source characteristic, and does not satisfy an NSF H1 requirement.
Generic logos, registration numbers, an “alimentaire” claim or a product name
cannot establish H1. Negative/pending declarations are excluded; explicit
canonical French declarations take priority over legacy translations.

`foodGrade` indicates an explicit H1 category without conflating the issuer;
the chunk text states the actual issuer/category separately. Ecology labels
come from an explicit catalogue description or dedicated BioPreferred metadata.
The content hash includes normalized metadata and its version, so changed
certification filters cannot accidentally reuse stale chunk metadata.

## Documents

Document metadata is synchronized from Sellbase. Mobile clients list documents
through `/products/pim/by-name/:name/documents` and read PDF content through the
authenticated Molyscan proxy. Technical sheets use the public Molydal PDF
endpoint associated with the Sellbase product instance. Safety sheets for the
`c_molydal` tenant use the verified public Sellbase archive by default, without
requiring `SELLBASE_MEDIA_BASE_URL` or sending a Sellbase token to that archive.
The configured media URL remains an optional authenticated override, and is
still required for certificates or other secondary files without a verified
default source.

FT links are offered after scan results, in scan history, and for products cited
by assistant answers. The assistant resolves FT and FS/FDS requests from the PIM
before calling the language model. It asks for a product name when context is
ambiguous and respects expert decisions that withdraw or correct an equivalent.
Document IDs survive subsequent PIM synchronizations.

Safety data sheets are stored on **level-5 references** in Sellbase. The API
exposes them from the already synchronized `PimReference.rawData`, deduplicating
identical files while retaining distinct reference-specific sheets. Confirmed
characteristics: FR `39`, IT `1044`, ES `1045`, EN `1046`, DE `1047`, PL `1052`,
NO `1054`, PT `1055`, RO `1056`, CS `1057`, HU `1304`, SK `1523`.

Read-only verification on 2026-09-16 confirmed FT PDF delivery for LUZOL FOOD G00
(Molydal instance `87538`) and FDS metadata for AGL 41 NF references
`AGL41NF150` / `AGL41NF1FT`. On 2026-09-17, a further investigation of the
[Sellbase Swagger](https://sellapi.sellbase-plateforme.com/api/doc),
[API documentation](https://sbprod02.sellbase-plateforme.com/doc_api_v2/) and public
Molydal pages identified and verified the binary source:
`https://static.sellbase-plateforme.com/molydal/molydal/`.

Sellbase stores flat filenames such as `AGL_41_NF_FDS_FR.pdf` in characteristic
`39`. The public archive places these files under the first one and two lowercase
characters: `a/ag/AGL_41_NF_FDS_FR.pdf`. Already relative paths are preserved.
This archive is different from the `molydal_p` image directory. The public
Molydal mirror at `/media/molydal/molydal/` also served the same French AGL PDF;
the implementation uses the Sellbase origin directly.

The following downloads returned HTTP 200, `application/pdf` and a valid PDF
signature during the 17 September read-only verification:

| PIM file | Language | Bytes |
|---|---|---:|
| [AGL_41_NF_FDS_FR.pdf](https://static.sellbase-plateforme.com/molydal/molydal/a/ag/AGL_41_NF_FDS_FR.pdf) | French | 175729 |
| [AGL_41_NF_FDS_GB.pdf](https://static.sellbase-plateforme.com/molydal/molydal/a/ag/AGL_41_NF_FDS_GB.pdf) | English | 165292 |
| [BLACK_SEAL_FDS_FR.pdf](https://static.sellbase-plateforme.com/molydal/molydal/b/bl/BLACK_SEAL_FDS_FR.pdf) | French | 239912 |
| [AN_310_FDS_FR.pdf](https://static.sellbase-plateforme.com/molydal/molydal/a/an/AN_310_FDS_FR.pdf) | French | 348642 |

The AGL French PDF was also inspected as text and rendered: it identifies AGL 41
NF, contains seven pages and gives a revision date of 18 February 2025. The PIM
datum modification date is older; it describes the stored filename, not the
revision of the PDF currently served at that filename. A real `ProductsService`
download using the reference metadata returned this FDS and the existing AGL FT
(81908 bytes), without configuring a media override. Database reads were
simulated for that service check; the upstream PDF downloads were real. No PIM
data was changed.

Only safety-sheet metadata belonging to an active product/reference is exposed.
An unavailable or missing file still returns an explicit temporary-unavailability
error; no arbitrary external URL is accepted from PIM metadata. Relative paths
are encoded, traversal components (including encoded ones) are rejected, and
media redirects are disabled. The built-in Molydal archive is not applied to
another Sellbase tenant.

The proxy requires the PDF signature at the beginning of the response, rejects
HTML even with HTTP 200 or an embedded PDF marker, and caps responses at 20 MB
including streams without a Content-Length header. The document-source and
proxy suites (`sellbase.documents.spec.ts`, `products.documents.spec.ts`) passed
31 tests, covering the public FDS paths, FT compatibility, the authenticated
override, path validation, tenant isolation, PDF validation and response size.
Mobile downloads
through Axios so JWT refresh applies; iOS reads the cached PDF in its native
WebView, and Android opens it in an installed PDF reader. A save/share action and
retry states are provided. `expo-intent-launcher` and `expo-sharing` require a new
native mobile build; verify opening and saving on iOS and Android devices before
delivery (including Android without a PDF reader).

## Deployment

1. Configure all `SELLBASE_*` and `RAG_EMBEDDING_*` variables.
2. Deploy the Prisma migration.
3. Deploy API and admin.
4. Run the first synchronization manually and monitor its admin history.
5. Verify the active index before retiring the legacy Supabase store.
