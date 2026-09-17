# Ashby URL reference

The CLI uses Ashby's public posting API. It does not submit applications or use
an API key.

## Endpoints

| Operation | URL |
|---|---|
| Search and detail data | `https://api.ashbyhq.com/posting-api/job-board/<board>` |
| Public posting URL | `https://jobs.ashbyhq.com/<board>/<job_id>` |

The response contains a `jobs` array. The parser reads `id`, `title`,
`location`, `locationName`, `isRemote`, `workplaceType`, `publishedAt`,
`jobUrl`, `applyUrl`, and the description fields. The public board response
contains enough description data for detail output; a guessed per-job API URL
returns HTTP 401, so detail looks up the selected ID in the board response.

## Configured boards

`buffer` and `testgorilla` were checked with live requests before registration.
