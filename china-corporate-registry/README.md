# China corporate-registry connector (bronze)

Feeder v2 connector that lands mainland China corporate-registry records into bronze.

The source is the public [GLEIF LEI Records API](https://api.gleif.org/docs) (CC0, no API key). Records are kept only when the entity was formed in China (`CN`) and both the registration authority and the validation authority are **RA000092**, the National Enterprise Credit Information Publicity System (全国企业信用信息公示系统), operated by the State Administration for Market Regulation. The registration number is the Unified Social Credit Code.

This connector does not call OpenCorporates, Qichacha, Tianyancha, or `gsxt.gov.cn`.

## Layout

```
schemas/china_corporate_registry.yaml   # Feeder v2 schema for the three bronze datasets
china_registry/                         # fetch, project, land, validate
data/bronze/china_corporate_registry/   # created by fetch
```

Bronze datasets, all required:

| Dataset | Grain | Register fields |
| --- | --- | --- |
| `entities` | one row per LEI | legal name, status, legal form, jurisdiction |
| `registrations` | one row per LEI | RA000092, USCC, corroboration, LEI lifecycle |
| `addresses` | legal and headquarters | registered office and headquarters |

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Bounded landing, then schema validation of all three datasets
python -m china_registry fetch --max-pages 2
python -m china_registry validate data/bronze/china_corporate_registry/batch_id=<id>

# Every China page (about 107k LEI records; most cite RA000092)
python -m china_registry fetch --full

# Daily incremental, using the watermark date in data/state/
python -m china_registry fetch --incremental
```

`fetch` writes the batch and runs validation before it exits 0.

## Tests

```bash
python -m unittest discover -s tests -v
```

## Coverage limit

GLEIF covers legal entities that hold an LEI, not every enterprise on GSXT. On 27 September 2026 the China jurisdiction filter returned 107,021 LEI records. A three-page audit kept 553 of 600 as RA000092 companies, and every kept USCC passed the GB 32100 check character. See [FINDINGS.md](FINDINGS.md).
