---
name: europe-visa-sponsors-search
version: 1.0.0
description: >
  Use this skill to search live job listings at European tech companies with
  documented visa-sponsorship practice (EU Blue Card, Dutch HSM, Irish Critical
  Skills, UK Skilled Worker, and similar routes). Covers 16 companies: Delivery
  Hero, Contentful, GetYourGuide, SumUp, Celonis, Zalando (Germany), Monzo,
  Deliveroo, Wise (UK), Wolt (Finland), Trustpilot (Denmark), Glovo (Spain),
  OVHcloud, BlaBlaCar (France), Feedzai, Unbabel (Portugal). Reads each company's
  own careers API, so results are current postings, not a cached list. Trigger
  phrases: Europe jobs with visa sponsorship, EU Blue Card jobs, jobs in Germany
  or the Netherlands or Ireland or the UK with sponsorship, search Monzo jobs,
  Zalando openings, Deliveroo careers, "is <company> hiring engineers".
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts *)
---

# Europe visa sponsors search skill

Search live job listings at 16 European tech companies that sponsor work visas.
The CLI reads each company's public careers API (Greenhouse, Lever, Ashby, or
SmartRecruiters), so every result is a current posting from the company itself.
No authentication, no API key, and zero runtime dependencies: it runs with just
`bun`.

## Scope: sponsorship is history, not a promise

The company list comes from a curated sponsorship sheet. Sponsorship activity is
per company and changes over time. A hit from this CLI means the company is
hiring; it does not mean the posting is sponsored. Check the posting's own
visa or work-authorization language before applying.

Some companies return zero openings between hiring rounds. Zero results from one
company is normal; check the `companies_failed` field to tell "no openings" from
"request failed".

## When to use this skill

- Search openings across all 16 companies, or one company, with keyword filters
- Filter by recency or remote flag
- Read the full description of one posting

## Commands

### Search openings

```bash
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts search [flags]
```

Flags:

- `--company, -c <key|all>: one company key, or `all` (default). Run `companies` to list keys.
- `--query, -q <text>: keywords, matched against title and location. All words must appear.
- `--jobage <days>: only jobs updated in the last N days.
- `--remote: only jobs the company flags as remote.
- `--limit, -n <n>: cap results. Default 50.
- `--format json|table|plain: default `json`.

### Read one posting

```bash
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts detail --company <key> <id>
```

Returns the full description as plain text.

### List companies

```bash
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts companies
```

Prints every company key, its ATS platform, HQ country, and display name.

## Usage examples

```bash
# Backend and Go roles across all 16 companies
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts search -q "backend go"

# Engineering roles at Monzo, updated in the last 14 days
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts search -c monzo -q "engineer" --jobage 14 --format table

# Remote Python roles, capped at 20 results
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts search -q "python" --remote -n 20

# Full description of one Monzo posting
bun run .agents/skills/europe-visa-sponsors-search/cli/src/cli.ts detail -c monzo 1234567
```

## Output

`json` is the default and the format `/scrape` consumes:

```json
{
  "query": "backend go",
  "count": 3,
  "companies_searched": 16,
  "companies_failed": 0,
  "jobs": [
    {
      "id": "1234567",
      "title": "Backend Engineer (Go)",
      "company": "Monzo",
      "country": "UK",
      "location": "London",
      "url": "https://monzo.co.uk/careers/...",
      "updated": "2026-08-20T10:00:00.000Z",
      "remote": false
    }
  ]
}
```

`table` fits quick scanning. `plain` reads one posting's full detail.

Per-company failures print a JSON warning to stderr and appear in the `errors`
array. The exit code is 1 only when every company fails or the usage is wrong.

## Notes

- Data comes from public careers APIs: `boards-api.greenhouse.io`, `api.lever.co`,
  `api.ashbyhq.com`, and `api.smartrecruiters.com`. See `url-reference.md` for
  the exact endpoints.
- Requests run in parallel, one per company per search. Keep search volume low.
- Company keys are lowercase names without spaces (`deliveryhero`, `getyourguide`).
