---
name: afriwork-search
description: >
  Search Afriwork's public Telegram job channel for Ethiopian openings. Use for
  Afriwork jobs, Ethiopian job listings, or a specific Afriwork channel post.
metadata:
  version: "1.0.0"
  enabled: "true"
---

# Afriwork job search

Search the public Afriwork channel, [@freelance_ethio](https://t.me/freelance_ethio), for job posts. This CLI returns channel summaries, not authenticated Mini App data.

## Personal use

Use this source for personal job search only. Afriwork's collection terms could not be verified. Keep searches low-volume. The CLI reads at most five public channel pages per search and never applies to a job or opens a Mini App link.

## Commands

```bash
bun run .agents/skills/afriwork-search/cli/src/cli.ts search [flags]
bun run .agents/skills/afriwork-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Search flags:

- `--query <text>` / `-q <text>` searches the title, company, location, and public post text.
- `--location <text>` / `-l <text>` filters by location.
- `--jobage <days>` keeps recent posts or posts with an open deadline.
- `--remote <mode>` accepts `remote`, `hybrid`, or `onsite` when the post names a work mode.
- `--page <n>` selects a 1-indexed page of results.
- `--limit <n>` / `-n <n>` sets the page size.
- `--format json|table|plain` selects output. The default is `json`.

Examples:

```bash
bun run .agents/skills/afriwork-search/cli/src/cli.ts search -q "backend developer" --location "Addis Ababa" --jobage 14 --limit 10 --format table
bun run .agents/skills/afriwork-search/cli/src/cli.ts detail afriwork:103757 --format plain
```

## Output and limits

Search JSON has `meta` and `results`. Each result includes `id`, `title`, `company`, `location`, `date`, and `url`. It also returns `applyUrl`, `deadline`, `employmentType`, `salary`, `workplaceType`, `remote`, and `detailsMayBeTruncated`.

IDs use the channel post number, for example `afriwork:103757`. The `url` opens the public channel post. `applyUrl` points to Afriwork's applicant Mini App when the channel post provides one.

Descriptions are copied from the public channel post. `descriptionStatus` is `excerpt` when the post contains a "view details" marker, `as-posted` when it does not, or `missing` when the post has no description. `as-posted` only describes the channel text. The Mini App may contain more information. Open it in Telegram to see the full listing.

Each search checks at most five channel pages, up to about 100 posts. `meta.hasMore` indicates whether the source exposes another page. When it is true, `meta.total` counts only matching posts scanned so far. A search that returns no results may miss older posts.

Errors go to stderr as JSON and exit with code 1. HTTP 429 and 5xx responses use the shared bounded retry policy. A missing post returns an error if the requested ID is not present in the public preview response.
