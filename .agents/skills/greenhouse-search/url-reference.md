# Greenhouse URL reference

The CLI uses Greenhouse's public job-board API. It does not submit applications
or use an API key.

## Endpoints

| Operation | URL |
|---|---|
| Search | `https://boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true` |
| Detail | `https://boards-api.greenhouse.io/v1/boards/<board>/jobs/<job_id>?content=true` |

The response contains a `jobs` array. The parser reads `id`, `title`,
`company_name`, `location.name`, `first_published`, `updated_at`,
`application_deadline`, `absolute_url`, and HTML `content`. Detail responses use
the same shape. Some boards link to a company-owned URL with
`gh_jid=<job_id>`; those hosts are mapped in the shared board configuration so
the result URL still works with `detail`.

## Configured boards

`contentful`, `getyourguide`, `sumup`, `monzo`, `wise`, `trustpilot`, `wolt`,
`feedzai`, `celonis`, `gitlab`, `huntress`, and `socket` were checked with live
requests before registration.

The API does not expose a consistent workplace-type field in these responses.
The CLI infers remote work from location and description text when possible.
