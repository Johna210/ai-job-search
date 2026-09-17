---
name: portal-cli-addition
description: >
  Add a job site through a dedicated, tested CLI instead of relying on WebSearch
  alone. Use when adding a job portal, company career page, ATS board, job source,
  or new scraper. Trigger phrases: add a job site, add a portal, build a job CLI,
  support this careers page, scrape this job board, new job source.
allowed-tools: Read, Write, Edit, Glob, Grep, Task, Bash(bun *), WebFetch, WebSearch
---

# Portal CLI addition

Use this workflow whenever a new job source should become part of the repository.
The goal is a dedicated search and detail CLI that `/scrape` can discover, not a
new WebSearch query that quietly remains fallback-only.

## 1. Classify the source

Record the portal URL, the market, the language, and the user's realistic test
query. Check whether the source is:

- A public JSON API or public ATS board. Build a direct CLI.
- A public HTML search page with stable result and detail anchors. Build a
  portal-specific CLI and parse each result independently.
- Login-gated, API-key-only, blocked by an access challenge, or missing a stable
  public listing endpoint. Keep it as WebSearch fallback-only and record why.

Read `url-reference.md` files and the existing `linkedin-search` skill before
choosing a structure. A source that returns HTTP 200 is not ready until its
response contains real titles, companies, dates, and resolvable posting URLs.

Check `robots.txt` and the site's terms. If personal use is the only reasonable
scope, put a clear personal-use warning in the new skill and keep request volume
low. Never bypass authentication or an access challenge.

## 2. Investigate before editing

Always delegate the initial investigation to an OpenCode `task` subagent before
editing source files. Use `subagent_type: "general"` and give it a read-only
research brief. The brief must name every source being checked, require primary
official pages or APIs, request exact endpoint and field evidence, and ask for a
compact matrix that marks unknowns instead of guessing. The subagent must not
modify the repository.

Do not use `agy` for this portal investigation. The main agent owns the decision,
so independently verify the subagent's important claims with `WebFetch` or a
bounded `curl` request before adding a board or enabling a skill.

The investigation must answer these questions:

1. What search endpoint and query parameter return postings?
2. How do location, recency, pagination, and result limits work?
3. Which fields contain the stable ID, title, company, location, date, URL, and
   application URL?
4. Where does a detail response expose description, deadline, employment type,
   and apply link?
5. Does one request return all description data, or does detail require a second
   request?
6. What happens for 404, 429, 5xx, and a missing or expired posting?

Save the endpoint paths, field paths, pagination rules, and quirks in the source's
`.agents/skills/<name>/url-reference.md`. Run one real search and one real detail
request before registering the source.

## 3. Reuse the direct adapter when it fits

The repository has a shared zero-runtime-dependency adapter in
`.agents/lib/direct-careers/` for these public ATS APIs:

- Greenhouse
- Ashby
- Lever
- SmartRecruiters

For a board on one of these APIs, add an explicit board entry to
`.agents/lib/direct-careers/config.ts`, extend the corresponding source reference,
and add a parser test or fixture for any new response shape. Keep the source's
discoverable skill under `.agents/skills/<name>-search/`.

For a different API or HTML site, create a source-owned CLI. Keep endpoint and
markup parsing in that CLI, not in `.agents/skills/job-scraper/`. Shared code is
fine when the protocol is genuinely shared; duplicate company-specific scrapers
are not.

## 4. Honor the portal CLI contract

Every registered source must expose:

```bash
bun run .agents/skills/<name>-search/cli/src/cli.ts search [flags]
bun run .agents/skills/<name>-search/cli/src/cli.ts detail <id|url> [flags]
```

Search supports these flags unless the source cannot support one of them, in
which case the limitation belongs in `SKILL.md`:

- `--query <text>` / `-q <text>`
- `--location <text>` / `-l <text>` when the source supports location filtering
- `--jobage <days>`
- `--remote remote|hybrid|onsite` when workplace data exists
- `--page <n>`
- `--limit <n>` / `-n <n>`
- `--format json|table|plain`, defaulting to `json`

Search JSON must have this shape:

```json
{
  "meta": { "count": 0, "page": 1, "total": 0 },
  "results": []
}
```

Each result must include `id`, `title`, `company`, `location`, `date`, and `url`.
Use `null` for unavailable values. Detail IDs must be stable and unambiguous when
one CLI covers several boards, for example `buffer:posting-id`.

Write errors to stderr as `{ "error": "...", "code": "..." }` and exit with
code 1. A temporary board failure may be reported as a partial failure when other
boards still return results. Retry 429 and 5xx responses with bounded exponential
backoff and jitter. Treat 404 as a missing posting, not as an empty successful
search.

Prefer Bun's built-in `fetch` and no runtime dependencies. Add a parser library
only when the real response requires it, and explain that choice in the CLI README.

## 5. Build the smallest complete source

Create or update these files:

```text
.agents/skills/<name>-search/
├── SKILL.md
├── url-reference.md
└── cli/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    ├── src/cli.ts
    └── tests/
```

The `SKILL.md` frontmatter must include `name`, `version`, `description`,
`context: fork`, and the exact `allowed-tools` command. Set `enabled: true` only
after the live gates below pass. Its body documents the source, flags, examples,
output shape, access limits, and known response quirks.

If the source is intentionally fallback-only, do not create a fake enabled CLI.
Keep the source query in `.agents/skills/job-scraper/search-queries.md` and state
the blocker in the research notes or task result.

## 6. Pass the live gates

Run these from the new CLI directory:

```bash
bun run typecheck
bun run test
```

Then run a real search with the documented test query:

```bash
bun run src/cli.ts search -q "<test query>" --limit 5 --format json
```

Check the actual JSON. At least one result must have a non-empty ID, title, and
portal URL. The date must be parseable, and the company must not be an HTML
fragment. Take one returned ID and verify its full description:

```bash
bun run src/cli.ts detail <returned-id> --format plain
```

The detail output must have readable text with decoded entities, stripped tags,
and preserved paragraph or list breaks. Also run a bogus-flag check and confirm it
returns a JSON error on stderr with exit code 1.

Do not enable the skill after typechecking alone. Search, detail, and tests are
all required. If a live source is rate-limited, stop the probe and mark the result
inconclusive rather than treating the limit as a parser failure.

## 7. Register and maintain it

The `/scrape` skill discovers every enabled `SKILL.md` directly under
`.agents/skills/*-search/`. No central registry is needed. After the live gates pass:

1. Set `enabled: true` in the source skill.
2. Add a fallback `site:` query to the two mirrored search-query files only when
   it is useful during CLI outages.
3. Keep the source's endpoint and field notes current in `url-reference.md`.
4. On later `/scrape` health checks, treat empty results, null fields, HTML in
   titles, invalid URLs, and detail failures as evidence to investigate.

A new source is complete only when its CLI is discoverable, its output satisfies
the shared contract, one live detail works, and the tests pass. Report the exact
command, result count, detail ID, endpoint, and any access warning.
