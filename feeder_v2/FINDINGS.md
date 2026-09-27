# China corporate-registry sources — findings (PO-1594 / PO-1693)

**Date:** 2026-09-27  
**Constraint:** free, register-grade identifiers, not already in this repo.

## Existing data we did not reuse

This repository already has an OpenCorporates Calgary / Alberta (`ca_ab`) research script. OpenCorporates is therefore **out of scope**. Paid Chinese commercial APIs (Qichacha, Tianyancha, Aiqicha, Wind, CSMAR) and scraping `gsxt.gov.cn` are also rejected (cost, ToS, no bulk API).

## What “perfect” registry data means here

A bronze corporate-registry row is only useful if it carries the identifier the government itself uses:

- **Mainland China:** 18-character Unified Social Credit Code (USCC / 统一社会信用代码), GB 32100-2015, issued via SAMR and published on the National Enterprise Credit Information Publicity System (NECIPS / GSXT).
- **Hong Kong:** Companies Registry record with an Inland Revenue Department Business Registration (BR) number in the official weekly open-data dump.

## Primary source — GLEIF CN (stream `cn_samr_lei`)

Live check on 2026-09-27 against `https://api.gleif.org/api/v1/lei-records`:

| Filter | Result |
| --- | --- |
| `filter[entity.jurisdiction]=CN` | 107,021 LEI records |
| `+ filter[entity.category]=GENERAL` | **106,401** operating companies (excludes most funds) |
| Sample of 50 GENERAL rows | **50/50** had `registeredAt.id = RA000092` and a checksum-valid USCC in `registeredAs` / `validatedAs` |

`RA000092` is GLEIF’s code for **National Enterprise Credit Information Publicity System**, operated by the State Administration for Market Regulation. Example bronze-grade row:

- Legal name: `张家口张大爷商贸有限公司`
- English name: `Uncle Zhang Trading Co., Ltd`
- USCC: `91130706MAEQDDYM9P` (checksum valid)
- LEI: `836800YS9DMNVXCP7748`
- Status: `ACTIVE`, legal form `ECAK` (有限责任公司), region `CN-HE`

The API is free, keyless, CC0, paginated (`page[size]` max 200), and updated from the GLEIF Golden Copy. This is the best bulk mainland register overlay that can actually be fetched without a paid Chinese KYC vendor.

Macao LEI pool (`jurisdiction=MO`) is ~2,590 records and was left out of the three bronze streams so the connector stays focused on SAMR USCC + HK CR + USCC index.

## Second source — Hong Kong Companies Registry (stream `hk_companies_register`)

Official CKAN package `hk-cr-crdata-list-newly-registered-companies-2526` on data.gov.hk. The Registry publishes weekly CSV pairs (no API key):

- `https://www.cr.gov.hk/docs/wrpt/RNC063/RNC063L_YYYYMMDD.csv` — local companies
- `https://www.cr.gov.hk/docs/wrpt/RNC063/RNC063F_YYYYMMDD.csv` — non-Hong Kong companies

Verified file `RNC063L_20241230.csv` (UTF-8 BOM) columns:

`Seq, Current Company Name in English, Current Company Name in Chinese, BR Number, Date of Incorporation, Date of Change of name`

Example: `3PLUS SOLUTIONS GLOBAL LIMITED` / `眾加國際有限公司` / BRN `77552157` / incorporated `2025-01-03`.

This is a **government register extract**, not a third-party scrape. It is an incremental feed (new / renamed companies since 2024-12-30), not a full historical dump of every live HK company. That limitation is acceptable for bronze: the identifiers and legal names are official.

Aggregate-only HK CR datasets (`statistics_01.csv` etc.) were ignored — they have counts, not companies.

## Third source — Wikidata P6795 (stream `cn_uscc_wikidata`)

Wikidata property [P6795](https://www.wikidata.org/wiki/Property:P6795) stores the same 18-character USCC. SPARQL endpoint `https://query.wikidata.org/sparql` returned **2,670** entities with P6795 (live count 2026-09-27). License is CC0.

This is not a government bulk dump. It is a complementary register-ID index for notable mainland legal persons that may not have an LEI yet (and therefore never appear in GLEIF). Rows that fail the GB 32100 checksum are dropped before bronze.

## Rejected alternatives

| Source | Why not |
| --- | --- |
| OpenCorporates `cn` / `hk` | Already used in this repo; user asked for **new** data |
| gsxt.gov.cn / NECIPS website | Authoritative, but no documented bulk API; anti-bot |
| Qichacha / Tianyancha / Aiqicha | Paid; GLEIF already maps a `qcc` field we do not call |
| SSE / SZSE / CNINFO listed-company directories | Securities registers, not the corporate register; listed set is a tiny subset of SAMR |
| HK full-register vendors (Renavon, crhk.guru) | Paid scrapes of ICRIS |
| GLEIF concatenated XML (~500 MB/day) | Same data as the API; API is the right incremental bronze interface |

## Feeder v2 contract

`connectors/china_corporate_registry.yaml` is the schema. The runtime lands three streams to bronze JSONL with `_SUCCESS` + `manifest.json`. `python -m feeder_v2 land-and-validate --profile validate` is the PO-1693 check: all three streams must be present, row counts must clear YAML `min_rows_validate`, USCC checksums / HK BRN shape must pass, and `source_system` must not be OpenCorporates.
