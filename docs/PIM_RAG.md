# PIM-backed RAG

Molyscan treats Sellbase as the sole source of truth for Molydal product data.
The legacy Supabase `product_chunks` index is used only until the first validated
PIM index is activated.

## Synchronization

- Manual: Admin → **PIM & RAG** → **Synchroniser maintenant**.
- Automatic: first day of every month at 03:00 Europe/Paris.
- The Sellbase master catalogue (`baseId=0`) defines the default scope: level 4
  products and level 5 references, **excluding archived products** as described
  below. It is not limited to the `SITE WEB MOLYDAL` publication (`52903`).
- `SELLBASE_CATALOG_BASE_ID` defaults to `0`. Setting it to a non-zero publication
  ID deliberately restricts the import to that publication and applies its field
  overrides on top of the master values.
- Element and data endpoints are paginated so the complete master catalogue is
  imported even when a level contains more than 1,000 rows.
- Products missing from the selected source scope are deactivated, never immediately deleted.
- Every product is hashed. Unchanged chunks reuse the previous embedding.

### Archived products

For tenant `c_molydal`, the separate **ARCHIVES PRODUITS** publication is excluded
from imports: base ID `87584`, publication element `25014121`. Selecting it as
`SELLBASE_CATALOG_BASE_ID` is rejected. Occurrences whose Sellbase `base_id`
belongs to this publication are also discarded without marking their shared
element IDs unavailable in another active base.

The legacy **ARCHIVAGE PRODUITS** folder remains excluded inside eligible source
trees. Its stable element ID is `25012891` (level 2, instance `59727`, French
label characteristic `10`), verified by read-only Sellbase API calls on
2026-09-23. The rest of **données principales** remains included. Molyscan never
moves or modifies any Sellbase record.

The filter matches ancestor element IDs at levels 1–3, so descendants remain
excluded after the folder is moved or renamed. It applies to products and
references before deduplication. **Archive membership takes precedence over
another placement of the same element**: for example, AIR S22 AL (`25012844`)
was present both in the archive and another category on the verification date.
Its other placement must not reintroduce it while both placements belong to the
selected eligible tree. The same rule applies to references shared between
multiple products. A reference is imported only when its parent product is
retained, named and active in the current run. A placement in the separately
excluded archive base does not blacklist an element still sold in base `0`.

If a publication is selected, archive membership is still read from the master
tree, so a stale publication copy cannot restore an archived product. Additional
folder IDs can be supplied through `SELLBASE_EXCLUDED_FOLDER_IDS` (positive
element IDs separated by commas); this adds exclusions and cannot remove the
built-in Molydal archive rule. The built-in ID is not applied to other tenants.

The next successful synchronization marks previously imported archived products
and their references inactive, keeping their records for traceability. Document
lookup and RAG retrieval already require active products/references. A separate
RAG index is then built from retained active products, validated and activated
transactionally; the previous index is archived for rollback. Merely restarting
the API does **not** remove old catalogue entries: a synchronization is required.
Historical scans/conversation text and expert decisions are not rewritten by
the import.

New scan/chat answers also check the current PIM availability before reusing an
expert equivalent or historical suggestion. A known inactive target is ignored
and the active catalogue is searched again; this does not create an expert
“no equivalent” decision. Existing explicit “no equivalent” decisions remain
authoritative. Stale assistant suggestions are removed only from the in-memory
model context, not from stored conversation history. FT/FDS requests cannot
silently substitute an active plus grade for its archived base product.

This check uses complete product names while retaining meaningful suffixes:
`STARNET` and `STARNET+` are different products. If a different PIM element with
the exact same name is still active, the name remains usable (for example KL
BIO, KL 111 and H 128 each have both an archived old record and an active record).
Unknown names are not falsely classified as archived. The read-only audit found
10 expert decisions naming archived records, but seven still resolve to active
homonyms; only the three decisions targeting STARNET become ineligible for new
recommendations. All decisions remain stored unchanged.

Safety checks count distinct retained products, then require at least 100 named
products and 100 lubricants **before catalogue changes**, preventing duplicate
placements or incomplete product data from satisfying the minimum. Retrieval
validation must still pass before index activation. A failed validation leaves
the previous index active; archived products are nevertheless unavailable to
retrieval because it also requires `p.active=true`. Catalogue rows may already
have been refreshed. Returning to the entire previous catalogue therefore needs
a targeted correction or a selective restoration of the PIM/index tables from
the pre-sync backup, along with the appropriate code. Do not blindly restore
the whole database: preserve scans, conversations and other user writes made
since the backup.

Read-only pre-deployment impact on 2026-09-23: 470 active products, 1,512 active
references and 427 active RAG chunks. The archive contains 141 of those products
and 352 references. Expected post-sync scope with that snapshot: **329 products,
1,160 references and 288 lubricant chunks**. These are snapshot counts, not
hard-coded import limits.

During the same delivery, Axel's follow-up email received at **08:19 UTC** asked
to exclude the new **ARCHIVES PRODUITS** base. Read-only API checks confirmed the
folder had moved from base `0` to base `87584` (`update_at` =
`2026-09-23 10:16:36`). It contains the same 141 product IDs but 349 references.
AIR S22 AL (`25012844`) now has only its active placement in the master
(instance `56870`), with references `25012900`, `25012901`, `25013812`; its
archived placement `63805` and references `25012847`, `25012848` are solely in
the excluded base. Its active master placement is therefore retained.

The completed sync `c050fbb9-8a8d-4b62-8b0f-92a3091fc4d8` accordingly has
**330 products, 1,163 references and 289 chunks**, after removing **140 products
and 349 references** from the previously active catalogue. The source changed
after the initial snapshot; the difference is not a failed exclusion. This run
reports zero folder-filter exclusions because the archives had already left
the source base before it ran. Future run details also record `excludedBaseIds`
alongside `excludedFolderIds`, `productsExcluded` and `referencesExcluded`.

For this change, back up the Molyscan database, deploy the API, then run
`npm run rag:sync:pim` from `apps/api` (or use Admin → PIM & RAG). No schema
migration is required. Check the completed run, active counts, the new active
index and the absence of archived product IDs from active search results.

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
