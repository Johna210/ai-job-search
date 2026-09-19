---
name: remote-search
description: >
  Search public remote job boards for software, data, AI, and engineering jobs
  worldwide. Use when the user asks for remote job listings, remote engineering
  jobs, or a posting from a supported remote board. Trigger phrases: remote jobs,
  remote software jobs, work from anywhere, remote backend jobs, remote AI jobs.
metadata:
  version: "1.0.0"
  enabled: "true"
---

# Remote job search

Search public feeds from Himalayas, We Work Remotely, Remote OK, Remotive,
Working Nomads, and Jobicy through one CLI. The CLI keeps each feed's parser
separate and returns one shared result shape.

## Personal use

Keep requests low-volume and read-only. Use the feeds for personal job search,
not bulk collection. Follow each site's terms, robots rules, and attribution
requirements.

## Commands

```bash
bun run .agents/skills/remote-search/cli/src/cli.ts search [flags]
bun run .agents/skills/remote-search/cli/src/cli.ts detail <board:id|url> [--format json|plain]
```

Search flags:

- `--query <text>` / `-q <text>` searches title, company, location, and description.
- `--location <text>` / `-l <text>` applies a client-side location filter.
- `--jobage <days>` keeps postings from the last N days. The default is 9999.
- `--remote <mode>` accepts `remote`, `hybrid`, or `onsite`. These feeds are remote-only.
- `--page <n>` selects a 1-indexed result page.
- `--limit <n>` / `-n <n>` sets the page size. The default is 25.
- `--format json|table|plain` selects output. The default is `json`.

## Examples

```bash
bun run .agents/skills/remote-search/cli/src/cli.ts search -q "backend engineer" --jobage 14 --limit 10 --format table
bun run .agents/skills/remote-search/cli/src/cli.ts search -q "machine learning" --location "Africa" --format table
bun run .agents/skills/remote-search/cli/src/cli.ts search -q "TypeScript" --remote remote --format json
bun run .agents/skills/remote-search/cli/src/cli.ts detail remoteok:1137399 --format plain
```

## Output

Search JSON is `{ "meta": { "count": ..., "page": ..., "total": ... }, "results": [...] }`.
Each result includes `id`, `title`, `company`, `location`, `date`, and `url`.
IDs are qualified with the feed name, for example `remoteok:1137399`.

The feed response already contains the description for the supported sources.
`detail` fetches that feed again and selects the requested posting. It does not
submit applications.

Errors go to stderr as JSON and exit with code 1. A failed feed does not hide
results from other feeds. Partial failures are reported on stderr.

## Feed limits

- Himalayas returns a public JSON page, usually 20 records, and exposes the full
  description, location restrictions, application URL, publication date, and
  expiry date. The CLI follows cursor pagination for the unfiltered feed and
  uses the feed's page parameter for keyword searches, up to ten source pages
  per request. Detail lookup repeats a narrow slug search across those pages.
- We Work Remotely and Remotive expose RSS feeds. The CLI uses their RSS fields
  and keeps the linked posting URL. It decodes XML entities and reads
  `expires_at` when present.
- Remote OK returns a public JSON array. The first object is feed metadata; job
  records include the full description, tags, date, and posting URL.
- Working Nomads exposes a public JSON page with 50 records and full descriptions.
- Jobicy accepts a public `count` parameter and returns up to 50 records with
  descriptions and posting URLs.

The feeds can change shape or impose rate limits. The CLI treats malformed
responses as feed failures instead of returning fabricated records.
