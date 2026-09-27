# Feeder v2 — China corporate-registry connector (bronze)

Tickets: **PO-1594** (YAML schema + bronze landing) and **PO-1693** (validate all three streams to bronze).

This package is a Feeder v2 source connector. It is **not** OpenCorporates (already used in this repo for Calgary / Alberta). Every bronze row carries an official register identifier:

| Stream | Source | Register ID | Authority |
| --- | --- | --- | --- |
| `cn_samr_lei` | [GLEIF Golden Copy API](https://www.gleif.org/en/lei-data/gleif-api) (CC0, no key) | Unified Social Credit Code (USCC, GB 32100-2015) | SAMR / GSXT (`RA000092`) |
| `hk_companies_register` | [Hong Kong Companies Registry weekly CSVs](https://data.gov.hk/en-data/dataset/hk-cr-crdata-list-newly-registered-companies-2526) | Business Registration number | HK Companies Registry |
| `cn_uscc_wikidata` | [Wikidata P6795](https://www.wikidata.org/wiki/Property:P6795) (CC0) | USCC | SAMR / GSXT |

See [FINDINGS.md](FINDINGS.md) for why these sources were chosen and what was rejected.

## Layout

```
feeder_v2/
  connectors/china_corporate_registry.yaml   # Feeder v2 YAML schema (source of truth)
  src/feeder_v2/                             # runtime: extract → bronze JSONL
  tests/                                     # contract + mocked landing tests
  bronze/                                    # local bronze landing zone
```

Each run writes:

```
bronze/china_corporate_registry/<stream>/dt=<YYYY-MM-DD>/run=<run_id>/
  part-00000.jsonl
  manifest.json
  _SUCCESS
```

## Run

```bash
cd feeder_v2
pip install -r requirements.txt
PYTHONPATH=src python -m feeder_v2 spec
PYTHONPATH=src python -m feeder_v2 land-and-validate --profile validate
```

`validate` profile lands a bounded slice of **all three** streams (PO-1693). `full` raises the caps (GLEIF ~106k CN GENERAL entities).

```bash
PYTHONPATH=src python -m feeder_v2 run --profile full
```

## Tests

```bash
cd feeder_v2
PYTHONPATH=src pytest -q
```

Live network is not required for pytest; extractors are exercised from fixtures. Use `land-and-validate` against the real APIs.

## Bronze record (contract)

Required fields are declared in the YAML `bronze_contract` and enforced by `feeder_v2.validation`:

- `register_id` + `register_id_type` + `register_authority`
- `legal_name`, `country_code`, `jurisdiction_code`, `entity_status`
- `_meta.layer = bronze`, source system, URI, ingest timestamps
- `raw` original payload
