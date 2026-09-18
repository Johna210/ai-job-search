---
name: lever-search
version: 1.0.0
description: >
  Search public Lever career boards for software, data, AI, and engineering jobs
  at configured companies worldwide or remotely. Use when the user asks for Lever
  jobs, direct company career listings, or a Lever posting detail. Trigger phrases:
  Lever jobs, company careers, software jobs, backend jobs, AI engineer jobs,
  remote engineering jobs, job openings.
enabled: true
---

# Lever search

Search BlaBlaCar's public Lever job board directly.

## Personal use

Keep requests low-volume and read-only. Do not use this CLI for commercial or
bulk collection, and check the source's current terms before automating more.

## Commands

```bash
bun run .agents/skills/lever-search/cli/src/cli.ts search [flags]
bun run .agents/skills/lever-search/cli/src/cli.ts detail <id|url> [--format json|plain]
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
bun run .agents/skills/lever-search/cli/src/cli.ts search -q "backend engineer" --jobage 14 --limit 10 --format table
bun run .agents/skills/lever-search/cli/src/cli.ts search -q "machine learning" --location "Paris" --format table
bun run .agents/skills/lever-search/cli/src/cli.ts search -q "platform" --remote remote --format table
bun run .agents/skills/lever-search/cli/src/cli.ts search -q "software engineer" --page 2 --limit 20
bun run .agents/skills/lever-search/cli/src/cli.ts detail 12345678 --format plain
```

## Output

Search JSON is `{ "meta": { "count": ..., "page": ..., "total": ... }, "results": [...] }`.
Each result includes `id`, `title`, `company`, `location`, `date`, and `url`.
Detail output adds the decoded description, deadline, employment type, and
application URL when the API provides them.

All errors go to stderr as JSON and exit with code 1. A failed board does not hide
results from other boards; partial failures are reported on stderr.

## Notes

- Data comes from a public Lever JSON endpoint. The CLI makes low-volume read-only
  requests and does not apply on the user's behalf.
- Lever supplies timestamps in milliseconds. The CLI converts them to ISO dates.
