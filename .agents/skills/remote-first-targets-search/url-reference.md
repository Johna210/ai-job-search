# Remote-first targets URL reference

Public, unauthenticated careers APIs used by this skill. One endpoint type per
ATS platform. The registry in `cli/src/cli.ts` maps each company to its platform
and board token.

## Greenhouse

Search:

```
GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=false
```

Returns `{ jobs: [...] }`. Each job carries `id`, `title`, `updated_at`,
`location.name`, and `absolute_url`. `content=false` skips the description body,
which keeps the payload small.

Detail:

```
GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}
```

Returns the job with `content` as HTML-entity-encoded text.

## Lever

Search and detail:

```
GET https://api.lever.co/v0/postings/{token}?mode=json
```

Returns an array of postings. Each carries `id`, `text` (title), `createdAt`
(epoch milliseconds), `hostedUrl`, `categories.location`, and `descriptionPlain`.
The list response already contains the full description, so detail reuses the
search response.

## Ashby

Search and detail:

```
GET https://api.ashbyhq.com/posting-api/job-board/{token}
```

Returns `{ jobs: [...] }`. Each job carries `id`, `title`, `location`,
`isRemote`, `workplaceType`, `publishedAt`, `updatedAt`, `jobUrl`, and
`descriptionHtml`. Detail reuses the search response.

## SmartRecruiters

Search:

```
GET https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=100&q={query}
```

Returns `{ content: [...], totalFound }`. Each posting carries `id`, `name`,
`releasedDate`, `location.city`, `location.country`, `location.remote`, and
`location.fullLocation`. The `q` parameter filters server side.

Detail:

```
GET https://api.smartrecruiters.com/v1/companies/{token}/postings/{id}
```

Returns the posting with `jobAd.sections`, where each section holds a `text`
field with HTML.

## Registry (verified 2026-08-24)

| Company | Platform | Token |
|---------|----------|-------|
| GitLab | Greenhouse | `gitlab` |
| Octopus Deploy | Greenhouse | `octopusdeploy` |
| Huntress | Greenhouse | `huntress` |
| Buffer | Ashby | `buffer` |
| TestGorilla | Ashby | `testgorilla` |
| Socket | Ashby | `socket` |
| Kinsta | Lever | `kinsta` |
| Doist | SmartRecruiters | `doist` |
| Automattic | SmartRecruiters | `automattic` |
| DuckDuckGo | SmartRecruiters | `duckduckgo` |

Companies from the source list with no public careers API are not in this
registry. They stay covered by the WebSearch fallback in
`.opencode/skills/job-scraper/search-queries.md`.
