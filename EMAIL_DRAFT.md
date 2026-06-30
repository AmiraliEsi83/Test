# Email to Mohammad — Ready to Send

**Subject:** Re: Polaris Interview Follow up — OpenCorporates Calgary Data Overview

---

Hi Mohammad,

Thank you again for the thoughtful follow-up. I've reviewed the [OpenCorporates website](https://opencorporates.com/) and [knowledge base](https://knowledge.opencorporates.com/), tested the API with my approved open-data account, and put together an overview of how we can access corporate data for Calgary, along with a Python script for daily/weekly retrieval.

## Key Findings

**Calgary is a city within Alberta province**, not a separate registry jurisdiction. On OpenCorporates, Calgary companies are best retrieved by filtering Canadian entities (`country_code=ca`) where the **registered address contains "Calgary"** (typically with region `AB`).

One important discovery during testing: the Alberta provincial registry code (`ca_ab`) is listed in OpenCorporates but currently returns **no search results** via the API. The working dataset for Calgary is primarily **federal Corporations Canada** records (`jurisdiction_code=ca`) with Calgary, AB registered addresses. I validated this with a live sync that retrieved **1,092 Calgary companies**. For full provincial Alberta registry coverage, bulk delivery may be needed.

## Recommended Approach

| Use Case | Approach |
|----------|----------|
| **Initial baseline** | Run the Python script in `--mode full` (alphabet-prefix sweep) |
| **Daily/weekly updates** | Run `--mode incremental` (uses `updated_at` since last successful run) |
| **Full Alberta provincial spine** | Evaluate OpenCorporates bulk delivery (commercial agreement) |

## Python Script

I've attached a production-ready script (`scripts/fetch_calgary_companies.py`) that:

- Authenticates via `OPENCORPORATES_API_TOKEN`
- Fetches Calgary companies using `country_code=ca` + `registered_address=Calgary`
- Supports **incremental** (daily) and **full** (weekly) sync modes
- Exports results to JSONL and CSV
- Tracks sync state for idempotent daily runs
- Handles rate limiting, retries, and API quota monitoring

**Quick usage:**

```bash
export OPENCORPORATES_API_TOKEN="your_token"
python scripts/fetch_calgary_companies.py --dry-run          # verify token
python scripts/fetch_calgary_companies.py --mode full        # initial load
python scripts/fetch_calgary_companies.py --mode incremental # daily updates
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
- (Optional) sample output: `data/output/calgary_companies_latest.csv`
