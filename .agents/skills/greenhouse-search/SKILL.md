---
name: greenhouse-search
version: 1.0.0
description: >
  Search public Greenhouse career boards for software, data, AI, and engineering
  jobs at configured companies worldwide or remotely. Use when the user asks for
  Greenhouse jobs, direct company career listings, or a Greenhouse posting detail.
  Trigger phrases: Greenhouse jobs, company careers, software jobs, backend jobs,
  AI engineer jobs, remote engineering jobs, job openings.
enabled: true
---

# Greenhouse search

Search configured companies' public Greenhouse job boards directly. The current
boards cover Contentful, GetYourGuide, SumUp, Monzo, Wise, Trustpilot, Wolt,
Feedzai, Celonis, GitLab, Huntress, Socket, and Octopus Deploy.

## Personal use

Keep requests low-volume and read-only. Do not use this CLI for commercial or
bulk collection, and check the source's current terms before automating more.

## Commands

```bash
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search [flags]
bun run .agents/skills/greenhouse-search/cli/src/cli.ts detail <board:id|url> [--format json|plain]
```

Search flags:

- `--query <text>` / `-q <text>` searches title, company, location, and description.
- `--location <text>` / `-l <text>` applies a client-side location filter.
- `--jobage <days>` keeps postings from the last N days. The default is 9999.
- `--remote <mode>` accepts `remote`, `hybrid`, or `onsite`.
- `--page <n>` selects a 1-indexed result page.
- `--limit <n>` / `-n <n>` sets the page size. The default is 25.
- `--format json|table|plain` selects output. The default is `json`.

## Examples

```bash
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "backend engineer" --jobage 14 --limit 10 --format table
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "machine learning" --location "Berlin" --format table
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "platform" --remote remote --format table
bun run .agents/skills/greenhouse-search/cli/src/cli.ts search -q "software engineer" --page 2 --limit 20
bun run .agents/skills/greenhouse-search/cli/src/cli.ts detail contentful:123456 --format plain
```

## Output

Search JSON is `{ "meta": { "count": ..., "page": ..., "total": ... }, "results": [...] }`.
Each result includes `id`, `title`, `company`, `location`, `date`, and `url`.
The ID is board-qualified, for example `gitlab:123456`. Pass it unchanged to
`detail`. Detail output adds the decoded description, deadline, employment type,
and application URL when the API provides them.

All errors go to stderr as JSON and exit with code 1. A failed board does not hide
results from other boards; partial failures are reported on stderr.

## Notes

- Data comes from public Greenhouse JSON endpoints. The CLI makes low-volume
  read-only requests and does not apply on the user's behalf.
- Greenhouse's `first_published` and `updated_at` fields are used for recency.
- The API does not reliably identify hybrid or onsite work, so those filters may
  exclude postings whose workplace type is not stated.
