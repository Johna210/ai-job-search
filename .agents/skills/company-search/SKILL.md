---
name: company-search
description: >
  Search public career pages for Deliveroo, Zalando, OVHcloud, and Automattic.
  Use when the user asks for direct company listings, software jobs at these
  companies, or a posting detail. Trigger phrases: company careers, Deliveroo
  jobs, Zalando jobs, OVHcloud jobs, Automattic jobs, direct engineering jobs.
metadata:
  version: "1.0.0"
  enabled: "true"
---

# Company career search

Search the official career pages for Deliveroo, Zalando, OVHcloud, and Automattic.
The CLI keeps the WordPress, custom HTML, SuccessFactors, and embedded Greenhouse
parsers separate while returning one result shape.

## Personal use

Keep requests low-volume and read-only. Use these pages for personal job search,
not bulk collection. The CLI never applies for a role.

## Commands

```bash
bun run .agents/skills/company-search/cli/src/cli.ts search [flags]
bun run .agents/skills/company-search/cli/src/cli.ts detail <board:id|url> [--format json|plain]
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
bun run .agents/skills/company-search/cli/src/cli.ts search -q "software engineer" --jobage 14 --limit 10 --format table
bun run .agents/skills/company-search/cli/src/cli.ts search -q "backend" --location "Berlin" --format json
bun run .agents/skills/company-search/cli/src/cli.ts detail deliveroo:324827 --format plain
```

## Output

Search JSON is `{ "meta": { "count": ..., "page": ..., "total": ... }, "results": [...] }`.
Each result includes `id`, `title`, `company`, `location`, `date`, and `url`.
IDs are qualified with the company name, for example `deliveroo:324827`.

Deliveroo and Automattic include descriptions in their list responses. Zalando
and OVHcloud return descriptions from their detail pages. The `detail` command
fetches the official posting page or API record and converts HTML to readable text.

Errors go to stderr as JSON and exit with code 1. A failed company page does not
hide results from the other pages. Partial failures are reported on stderr.

## Source limits

- Deliveroo exposes a public WordPress REST endpoint with pagination and detail
  records under `/wp-json/wp/v2/roles`.
- Zalando accepts the `q` query parameter on its jobs page. The page includes 15
  job cards per page, a matching-job count, update timestamps, and public detail
  pages. The CLI follows the result pages and trusts the page's server-side
  keyword filter. When `--remote` is set, it fetches the returned detail pages
  to classify remote and hybrid roles.
- OVHcloud uses a public SuccessFactors tile-search endpoint and public detail
  pages. Some fields are localized, so the CLI keeps dates and workplace details
  null when the page does not provide them.
- Automattic embeds its current Greenhouse-style records in `ghJobsData` on the
  official jobs page. The embedded records include full descriptions and links.

The HTML pages can change. The CLI treats missing cards or malformed embedded
data as source failures instead of returning incomplete records as valid jobs.
