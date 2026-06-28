# OpenCorporates: Calgary Corporate Data — Research Findings

**Prepared for:** Reviewerly / Polaris follow-up  
**Date:** June 28, 2026  
**Author:** Amir Ali Eslami

---

## Executive Summary

Corporate registry data for **Calgary** is available through [OpenCorporates](https://opencorporates.com/) via two primary delivery mechanisms: the **REST API** (best for incremental daily/weekly sync) and **Bulk Delivery** (best for full provincial datasets). Calgary is a **city within Alberta province**, not a separate legal jurisdiction — companies are registered at the **Alberta Corporate Registry** level with jurisdiction code `ca_ab`, and Calgary-specific records are filtered by **registered address**.

---

## 1. Understanding the Geography

| Term | Reality |
|------|---------|
| "Calgary province" (email wording) | Calgary is a **city** in **Alberta**, a Canadian province |
| OpenCorporates jurisdiction | `ca_ab` (ISO 3166-2: `CA-AB`) |
| Official registry | [Alberta Corporate Registry](https://www.alberta.ca/corporate-registry) (Service Alberta) |
| OpenCorporates register page | [Corporate Registry Office — Alberta](https://opencorporates.com/registers/7) |

OpenCorporates aggregates data from the official Alberta Corporate Registry. The data includes company name, number, type, status, incorporation/dissolution dates, registered address, officers (where available), and provenance metadata.

---

## 2. Data Delivery Options

OpenCorporates offers two mechanisms ([Which delivery mechanism is right for you?](https://knowledge.opencorporates.com/knowledge-base/which-delivery-mechanism-is-right-for-you/)):

### Option A: REST API (Recommended for Daily/Weekly Sync)

| Aspect | Detail |
|--------|--------|
| **Best for** | Incremental updates, workflow automation, low-latency lookups |
| **Endpoint** | `https://api.opencorporates.com/v0.4/` |
| **Auth** | API token via `X-API-TOKEN` header or `api_token` query param |
| **Signup** | [opencorporates.com/api_accounts/new](https://opencorporates.com/api_accounts/new) |
| **Rate limits** | Per commercial plan; monitor via `GET /v0.4/account_status` |
| **Pagination** | 30 results/page default, up to 100 with `per_page=100`; max `page=100` |
| **Latency** | Registry → OpenCorporates ingestion can take hours to days per jurisdiction |

### Option B: Bulk Delivery (Recommended for Full Provincial Load)

| Aspect | Detail |
|--------|--------|
| **Best for** | Full Alberta dataset as a spine, analytics, combining with other datasets |
| **Format** | CSV via SFTP |
| **Access** | Commercial agreement required ([Bulk Delivery Walkthrough](https://knowledge.opencorporates.com/knowledge-base/bulk-delivery-walkthrough/)) |
| **Calgary filter** | Filter bulk `ca_ab` records where `registered_address.locality` contains "Calgary" |
| **Latency** | Bulk deliveries aim to be ≤ 1 month behind the registry |

### Recommendation for Reviewerly

| Use Case | Approach |
|----------|----------|
| **Initial baseline** | Bulk `ca_ab` delivery → filter Calgary, **or** API alphabet sweep (see script) |
| **Daily/weekly updates** | API with `updated_at` date filter + `jurisdiction_code=ca_ab` + `registered_address=Calgary` |
| **Single company lookup** | `GET /v0.4/companies/ca_ab/{company_number}` |
| **Officer data** | `GET /v0.4/companies/ca_ab/{company_number}` (officers embedded) or officer search |

---

## 3. How to Query Calgary Companies via API

### Key Parameters

```
GET https://api.opencorporates.com/v0.4/companies/search
```

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `jurisdiction_code` | `ca_ab` | Restrict to Alberta-registered entities |
| `registered_address` | `Calgary` | Filter by city in registered address |
| `updated_at` | `2026-06-21:` | Incremental sync — records updated since date |
| `inactive` | `false` | Exclude dissolved/inactive (optional) |
| `per_page` | `100` | Max page size |
| `order` | `updated_at` | Newest changes first |

### Example: Incremental Daily Sync

```bash
curl --header "X-API-TOKEN: YOUR_TOKEN" \
  "https://api.opencorporates.com/v0.4/companies/search\
?jurisdiction_code=ca_ab\
&registered_address=Calgary\
&updated_at=2026-06-27:\
&inactive=false\
&per_page=100\
&page=1\
&order=updated_at"
```

### Example: Fetch a Single Company

```bash
curl --header "X-API-TOKEN: YOUR_TOKEN" \
  "https://api.opencorporates.com/v0.4/companies/ca_ab/2012345678"
```

### Example: Check API Quota

```bash
curl --header "X-API-TOKEN: YOUR_TOKEN" \
  "https://api.opencorporates.com/v0.4/account_status"
```

---

## 4. Important Caveats

1. **Calgary is address-based, not jurisdictional.** A company registered in Alberta may operate in Calgary but have a registered office elsewhere (e.g., Edmonton). Conversely, `registered_address=Calgary` may miss companies that list only a postal code. Post-sync client-side validation is recommended.

2. **API search requires a `q` parameter for name-based queries.** For broad enumeration, the provided script uses an alphabet-prefix sweep (`a*`, `b*`, …) combined with jurisdiction and address filters. For incremental sync, `updated_at` filtering reduces the need for exhaustive sweeps.

3. **Page limit of 100.** API pages are capped at 100. Large result sets require alphabet splitting or bulk delivery.

4. **Data freshness.** OpenCorporates re-fetches Alberta data on a schedule (varies by registry). The `retrieved_at` and `updated_at` fields indicate when data was last pulled from the source.

5. **Licensing.** OpenCorporates data is under the [Open Database Licence (ODbL)](https://opendatacommons.org/licenses/odbl/) with share-alike attribution. Commercial API plans have separate terms.

6. **Alberta registry limitations.** Per the [Open Company Data Index](https://opencorporates.com/registers/7), Alberta scores 0/100 on free searchability and open licensing — OpenCorporates is the practical access path.

---

## 5. Proposed Architecture for Daily/Weekly Pipeline

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Cron / Scheduler│────▶│  fetch_calgary_      │────▶│  data/output/   │
│  (daily 06:00 UTC)│     │  companies.py        │     │  JSONL + CSV    │
└─────────────────┘     └──────────┬───────────┘     └─────────────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  OpenCorporates API  │
                        │  jurisdiction: ca_ab │
                        │  address: Calgary    │
                        │  updated_at: since   │
                        └──────────────────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  data/state.json     │
                        │  (last sync timestamp)│
                        └──────────────────────┘
```

### Cron Examples

```cron
# Daily incremental sync at 06:00 UTC
0 6 * * * cd /path/to/project && .venv/bin/python scripts/fetch_calgary_companies.py --mode incremental >> logs/sync.log 2>&1

# Weekly full refresh on Sundays at 02:00 UTC
0 2 * * 0 cd /path/to/project && .venv/bin/python scripts/fetch_calgary_companies.py --mode full >> logs/sync.log 2>&1
```

---

## 6. Data Fields Available (Company Record)

From the [Data Dictionary: Companies](https://knowledge.opencorporates.com/knowledge-base/data-dictionary-companies/):

| Field | Description |
|-------|-------------|
| `company_number` | Alberta Corporate Registry ID |
| `jurisdiction_code` | `ca_ab` |
| `name` | Legal entity name |
| `company_type` | e.g., Alberta Corporation, Trade Name |
| `current_status` | Active, Struck, Dissolved, etc. |
| `incorporation_date` | Date of incorporation |
| `dissolution_date` | Date dissolved (if applicable) |
| `registered_address` | Structured address (street, locality, region, postal_code) |
| `inactive` | Boolean inactive flag |
| `officers` | Directors/officers (via detail endpoint) |
| `retrieved_at` | When OpenCorporates last fetched from registry |
| `registry_url` | Link to official Alberta registry record |

---

## 7. Next Steps for Reviewerly

1. **Obtain an OpenCorporates API key** (or bulk SFTP credentials for full provincial data).
2. **Run initial sync** with `python scripts/fetch_calgary_companies.py --mode full`.
3. **Schedule daily incremental** sync with `--mode incremental`.
4. **Evaluate bulk delivery** if the full Alberta corpus is needed for analytics or matching.
5. **Layer enrichment** — combine with CRA business numbers (`identifiers` with `ca_bn`), sanctions lists, or internal Reviewerly data.

---

## References

- [OpenCorporates](https://opencorporates.com/)
- [OpenCorporates Knowledge Base](https://knowledge.opencorporates.com/)
- [API Reference v0.4.8](https://api.opencorporates.com/documentation/API-Reference)
- [API Authentication](https://knowledge.opencorporates.com/knowledge-base/api-authentication-authorisation/)
- [API Walkthrough](https://knowledge.opencorporates.com/knowledge-base/api-walkthrough/)
- [Alberta Corporate Registry](https://www.alberta.ca/corporate-registry)
