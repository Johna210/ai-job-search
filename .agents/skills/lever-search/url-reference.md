# Lever URL reference

The CLI uses Lever's public JSON postings endpoint. It does not submit
applications or use an API key.

## Endpoints

| Operation | URL |
|---|---|
| Search and detail data | `https://api.lever.co/v0/postings/<slug>?mode=json` |
| Public posting URL | `https://jobs.lever.co/<slug>/<posting_id>` |

The response is an array. The parser reads `id`, `text`, `categories.location`,
`categories.allLocations`, `categories.commitment`, `createdAt`, `updatedAt`,
`hostedUrl`, `applyUrl`, `description`, and `descriptionPlain`.

## Configured boards

`blablacar` was checked with a live request before registration.
