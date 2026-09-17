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
The parser reads `id`, `name`, `location`, `releasedDate`,
`postingUrl`, `applyUrl`, `typeOfEmployment.label`, `type`, and detail
`jobAd.sections`. `location.hybrid` and `location.remote` provide workplace
signals. The CLI follows pages until the reported total or an empty page and
applies the remaining filters locally.

## Configured boards

`deliveryhero`, `kinsta`, and `glovo` were checked with live requests before
registration. The public company URL IDs are `DeliveryHero` and `Kinsta`; Glovo
uses the Delivery Hero URL ID with `board=glovo`.

SmartRecruiters accepted `q` for Delivery Hero during probing. The CLI still
filters locally because keyword parameter behavior differs across company boards.
The Glovo board fetches the full Delivery Hero feed, filters the `Brands: Glovo`
custom field, and then applies the local query filter so no Glovo postings are
lost to the server's keyword limit.
