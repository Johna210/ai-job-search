# Company career URL reference

The CLI uses public, read-only company endpoints. It does not use credentials or
submit applications.

| Company | Search endpoint | Detail endpoint or page |
|---|---|---|
| Deliveroo | `https://careers.deliveroo.co.uk/wp-json/wp/v2/roles?per_page=100&page=1` | `/wp-json/wp/v2/roles/<id>` or `/wp-json/wp/v2/roles?slug=<slug>` |
| Zalando | `https://jobs.zalando.com/en/jobs?q=<query>&page=<n>` | The `/en/jobs/<id>-<slug>` URL from each card |
| OVHcloud | `https://careers.ovhcloud.com/search/tile-search-results?q=<query>&startrow=0` | The `/job/<slug>/<id>/` URL from each tile |
| Automattic | `https://automattic.com/work-with-us/jobs/` | The `href` embedded in each `ghJobsData` record |

## Parsed fields

- Deliveroo reads `id`, `title.rendered`, `content.rendered`, `link`, `date`,
  `modified`, and ATS values in `meta`.
- Zalando reads the job card link, `h2` title, category, location, and the
  `updated_at` value embedded in the page's RSC data. Detail reads the title,
  `Location`, `Contract`, and role content.
- OVHcloud reads the tile's `job-id`, `data-url`, title link, contract, and
  location. Detail reads the canonical URL, `og:title`, `datePosted`,
  `streetAddress`, application link, and the `jobdescription` span.
- Automattic reads `id`, `title`, `content`, `href`, and employment fields when
  the embedded record provides them.

The CLI uses the list response for search and the official detail response for
full descriptions where the list has only a card. It keeps unknown dates and
workplace fields as `null`.
