# China corporate registry — source findings

**Date:** 27 September 2026  
**Connector:** `china_corporate_registry` (Feeder v2, bronze)

## Choice

The register of record for a mainland company is the National Enterprise Credit Information Publicity System (全国企业信用信息公示系统, GSXT), operated by the State Administration for Market Regulation (国家市场监督管理总局). GLEIF publishes that register identifier, for entities that have an LEI, in its free golden copy.

| Item | Value |
| --- | --- |
| API | `https://api.gleif.org/api/v1/lei-records` |
| Filter | `filter[entity.jurisdiction]=CN` |
| Keep rule | `registeredAt.id` and `validatedAt.id` are `RA000092`, and `registeredAs` equals `validatedAs` |
| Registration authority | RA000092 — National Enterprise Credit Information Publicity System |
| Operator | State Administration for Market Regulation |
| Register website | `http://www.gsxt.gov.cn/` |
| Registration number | 18-character Unified Social Credit Code (GB 32100-2015) |
| License | CC0 1.0 — no API key |
| China LEI population checked | 107,021 records |

A live record fetched on 27 September 2026:

| Field | Value |
| --- | --- |
| Legal name | 太平洋纺织机械（常熟）有限公司 |
| English name | PACIFIC TEXTILE MACHINERY (CHANGSHU) CO.,LTD. |
| LEI | `8368008HPTBGMFR3OV25` |
| USCC | `9132058172520705XD` |
| Authority | RA000092 |
| Entity status | ACTIVE |
| Legal form | ECAK / 企业 |
| Created | 2001-01-20 |
| Legal address | 常熟市阳光大道8号, 苏州市, CN-JS |
| Corroboration | FULLY_CORROBORATED |
| Validated as | the same USCC, by RA000092 |

Three pages (600 China LEI records) were audited the same day. 553 cited RA000092. All 553 had a checksum-valid USCC, matching `validatedAs`, entity status ACTIVE, and a legal address. LEI registration status was ISSUED (435) or LAPSED (118). A lapsed LEI means the identifier was not renewed. It is stored separately from `entity_status` and is not treated as a dissolved company.

A bounded connector run the same day (`fetch --max-pages 2`) landed 400 raw China LEI records and kept 357. Validation passed for all three bronze datasets: 357 entities, 357 registrations, 714 addresses. The first kept row was 太平洋纺织机械（常熟）有限公司, USCC `9132058172520705XD`, authority RA000092. Eight kept rows use legal-form code `8888` (free text on the register, for example 有限责任公司(外国法人独资)) instead of an ISO 20275 name. Corroboration on that batch was FULLY_CORROBORATED for 307 rows and PARTIALLY_CORROBORATED for 50. Both are kept when the USCC check character passes.

## Sources that were not used

| Source | Why it was skipped |
| --- | --- |
| OpenCorporates | Already used for the Calgary / Alberta pull. Not a new China register. |
| `gsxt.gov.cn` scraping | The official site is the register, but it is Chinese-only, throttled, and not a bulk feed. The connector cites GSXT through GLEIF instead of scraping it. |
| Qichacha, Tianyancha, Qixinbao, Aiqicha | Commercial repackages of GSXT. Not free register feeds. |
| cninfo `szse_stock.json` | Fetched successfully (6,258 rows) but the fields are stock code, pinyin, category, org id, and short name. There is no USCC and no registration authority. `sse_stock.json` returned 404. |
| GitHub “Enterprise-Registration-Data-of-Chinese-Mainland” | Static 1978–2019 compilation, CC BY-NC-SA, not a live register. |
| Hong Kong Companies Registry (RA000388) | Separate register. GLEIF shows 13,596 Hong Kong LEIs. Out of scope for mainland China. |

## Bronze contract

`schemas/china_corporate_registry.yaml` is the Feeder v2 schema. A successful landing writes all three datasets, plus the raw GLEIF page and a manifest:

- `entities.jsonl` — legal entity
- `registrations.jsonl` — RA000092 and the USCC
- `addresses.jsonl` — legal address and headquarters address

Validation fails if any of the three is missing, empty, or out of contract, if a USCC or LEI checksum fails, or if the three datasets do not join on LEI.

## Incremental pull

Daily runs should use `python -m china_registry fetch --incremental`. The state file stores the calendar date of the newest `registration.lastUpdateDate` in the batch. The next call asks GLEIF for China records updated after that date. GLEIF serves the golden copy, which is refreshed through the day, so a morning schedule is enough.
