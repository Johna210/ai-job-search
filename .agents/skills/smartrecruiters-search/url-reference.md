# SmartRecruiters URL reference

The CLI uses SmartRecruiters' public postings API. It does not submit
applications or use an API key.

## Endpoints

| Operation | URL |
|---|---|
| Search | `https://api.smartrecruiters.com/v1/companies/<company>/postings?limit=100&offset=0` |
| Search with server keyword filter | Add `q=<query>` to the search URL |
| Detail | `https://api.smartrecruiters.com/v1/companies/<company>/postings/<posting_id>` |

Search responses contain a `content` array, `totalFound`, and pagination data.
The parser reads `id`, `name`, `company.name`, `location`, `releasedDate`,
`postingUrl`, `applyUrl`, `typeOfEmployment.label`, `type`, and detail
`jobAd.sections`. `location.hybrid` and `location.remote` provide workplace
signals. The CLI follows pages until the reported total or an empty page and
applies the remaining filters locally.

## Configured boards

`deliveryhero` and `kinsta` were checked with live requests before registration.
The public company URL IDs are `DeliveryHero` and `Kinsta`.

SmartRecruiters accepted `q` for Delivery Hero during probing. The CLI still
filters locally because keyword parameter behavior differs across company boards.
