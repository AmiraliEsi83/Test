# Draft Email Reply to Mohammad

**Subject:** Re: Polaris Interview Follow up — OpenCorporates Calgary Data Overview

---

Hi Mohammad,

Thank you again for the thoughtful follow-up. I've reviewed the [OpenCorporates website](https://opencorporates.com/) and [knowledge base](https://knowledge.opencorporates.com/), and put together an overview of how we can access corporate data for Calgary, along with a Python script for daily/weekly retrieval.

## Key Findings

**Calgary is a city within Alberta province**, not a separate registry jurisdiction. On OpenCorporates, Alberta-registered companies use jurisdiction code **`ca_ab`**, sourced from the official [Alberta Corporate Registry](https://www.alberta.ca/corporate-registry). To target Calgary specifically, we filter by **registered address** (e.g., `registered_address=Calgary` combined with `jurisdiction_code=ca_ab`).

## How We Can Get the Data

OpenCorporates offers two delivery mechanisms:

1. **REST API** (recommended for daily/weekly sync) — incremental updates using `updated_at` date filters, single-company lookups, and officer data. Requires an API token from [opencorporates.com/api_accounts/new](https://opencorporates.com/api_accounts/new).

2. **Bulk Delivery** (recommended for a full provincial baseline) — CSV files via SFTP under a commercial agreement. We would filter the Alberta dataset client-side for Calgary addresses.

For ongoing operations, I'd recommend: **bulk for the initial Alberta spine**, then **API for daily incremental Calgary updates**.

## Python Script

I've attached a production-ready script (`scripts/fetch_calgary_companies.py`) that:

- Authenticates via `OPENCORPORATES_API_TOKEN`
- Fetches Calgary companies from jurisdiction `ca_ab`
- Supports **incremental** (daily) and **full** (weekly) sync modes
- Exports results to JSONL and CSV
- Tracks sync state for idempotent daily runs
- Handles rate limiting, retries, and API quota monitoring

**Quick usage:**

```bash
export OPENCORPORATES_API_TOKEN="your_token"
python scripts/fetch_calgary_companies.py --mode incremental   # daily
python scripts/fetch_calgary_companies.py --mode full          # weekly
```

A detailed findings document (`FINDINGS.md`) covers API parameters, architecture, caveats, and next steps.

Happy to walk through this in more detail or adjust the approach based on Reviewerly's specific data needs.

Best regards,  
Amir Ali Eslami

---

**Attachments to include when sending:**
- `FINDINGS.md`
- `scripts/fetch_calgary_companies.py`
- `requirements.txt`
- `README.md`
