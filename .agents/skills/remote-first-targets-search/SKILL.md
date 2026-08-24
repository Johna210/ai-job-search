---
name: remote-first-targets-search
version: 1.0.0
description: >
  Use this skill to search live job listings at remote-first companies: GitLab,
  Automattic, Buffer, Doist, DuckDuckGo, Kinsta, TestGorilla, Octopus Deploy,
  Huntress, and Socket. Reads each company's own careers API (Greenhouse, Lever,
  Ashby, or SmartRecruiters), so results are current postings, not a cached
  list. Trigger phrases: remote-first company jobs, GitLab openings, Automattic
  hiring, Buffer jobs, DuckDuckGo careers, "is GitLab hiring engineers", remote
  developer jobs at these companies.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts *)
---

# Remote-first targets search skill

Search live job listings at 10 remote-first companies. The CLI reads each
company's public careers API (Greenhouse, Lever, Ashby, or SmartRecruiters), so
every result is a current posting from the company itself. No authentication, no
API key, and zero runtime dependencies: it runs with just `bun`.

## Scope: company status, not posting rules

The company list is curated. Remote-first describes how the company hires, not
what each posting allows. A role can still be region-bound or office-based.
Each result carries the posting's own location; check it before applying.

Some companies return zero openings between hiring rounds. Zero results from one
company is normal; check the `companies_failed` field to tell "no openings" from
"request failed".

## When to use this skill

- Search openings across all 10 companies, or one company, with keyword filters
- Filter by recency or remote flag
- Read the full description of one posting

## Commands

### Search openings

```bash
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts search [flags]
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
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts detail --company <key> <id>
```

Returns the full description as plain text.

### List companies

```bash
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts companies
```

Prints every company key, its ATS platform, HQ country, and display name.

## Usage examples

```bash
# Backend roles across all 10 companies
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts search -q "backend"

# Python roles at GitLab, updated in the last 14 days
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts search -c gitlab -q "python" --jobage 14 --format table

# Remote engineering roles, capped at 20 results
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts search -q "engineer" --remote -n 20

# Full description of one GitLab posting
bun run .agents/skills/remote-first-targets-search/cli/src/cli.ts detail -c gitlab 1234567
```

## Output

`json` is the default and the format `/scrape` consumes:

```json
{
  "query": "backend",
  "count": 2,
  "companies_searched": 10,
  "companies_failed": 0,
  "jobs": [
    {
      "id": "1234567",
      "title": "Backend Engineer",
      "company": "GitLab",
      "country": "USA",
      "location": "Remote",
      "url": "https://about.gitlab.com/jobs/...",
      "updated": "2026-08-20T10:00:00.000Z",
      "remote": true
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
- Company keys are lowercase names without spaces (`octopusdeploy`, `testgorilla`).
