# OpenCorporates Calgary Corporate Data Sync

Production-ready tooling to fetch corporate registry data for **Calgary, Alberta** from the [OpenCorporates API](https://api.opencorporates.com/documentation/API-Reference).

Prepared as a Reviewerly / Polaris interview follow-up deliverable.

## Quick Start

```bash
# 1. Clone and set up
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Configure API token
cp .env.example .env
# Edit .env and add your token from https://opencorporates.com/api_accounts/new
export OPENCORPORATES_API_TOKEN="your_token_here"

# 3. Verify connectivity
python scripts/fetch_calgary_companies.py --dry-run

# 4. Run initial full sync
python scripts/fetch_calgary_companies.py --mode full

# 5. Run daily incremental sync
python scripts/fetch_calgary_companies.py --mode incremental
```

## What This Does

| Item | Detail |
|------|--------|
| **Jurisdiction** | `ca_ab` (Alberta, Canada) |
| **City filter** | Registered address contains "Calgary" |
| **API version** | v0.4 (HTTPS, `X-API-TOKEN` header) |
| **Output** | `data/output/calgary_companies_*.jsonl` and `.csv` |
| **State** | `data/state.json` tracks last sync for incremental runs |

## Sync Modes

| Mode | When to Use | Behavior |
|------|-------------|----------|
| `--mode full` | Weekly or initial load | Alphabet-prefix sweep (`a*`…`z*`, `0*`…`9*`) across all Calgary companies |
| `--mode incremental` | Daily | Fetches only records with `updated_at` since last successful run |

## Scheduling

```cron
# Daily incremental at 06:00 UTC
0 6 * * * cd /path/to/project && .venv/bin/python scripts/fetch_calgary_companies.py --mode incremental >> logs/sync.log 2>&1

# Weekly full refresh on Sunday at 02:00 UTC
0 2 * * 0 cd /path/to/project && .venv/bin/python scripts/fetch_calgary_companies.py --mode full >> logs/sync.log 2>&1
```

## Project Structure

```
.
├── FINDINGS.md                          # Detailed research & architecture
├── EMAIL_DRAFT.md                       # Ready-to-send reply to Mohammad
├── README.md
├── requirements.txt
├── .env.example
├── scripts/
│   └── fetch_calgary_companies.py       # Main sync script
└── data/
    ├── state.json                       # Created on first run
    └── output/                          # JSONL + CSV exports
```

## Documentation

See [FINDINGS.md](FINDINGS.md) for:

- How Calgary maps to OpenCorporates (`ca_ab` + address filter)
- API vs Bulk delivery trade-offs
- Example API calls and caveats
- Proposed pipeline architecture

## License Note

OpenCorporates data is provided under the [Open Database Licence (ODbL)](https://opendatacommons.org/licenses/odbl/). Attribution to OpenCorporates is required. Commercial API usage is subject to your plan terms.
