# Remote feed URL reference

The CLI uses public, read-only endpoints. It does not use API keys or submit
applications.

| Feed | Search endpoint | Detail data |
|---|---|---|
| Himalayas | `https://himalayas.app/jobs/api` or `/jobs/api/search?q=<query>` | The page record contains `description`, `applicationLink`, `guid`, `pubDate`, and `expiryDate`. The unfiltered feed supports `cursor`; keyword searches support `page`. The CLI reads at most ten source pages per request. |
| We Work Remotely | `https://weworkremotely.com/remote-jobs.rss` | RSS items contain `title`, `region`, `skills`, `description`, `pubDate`, `expires_at`, and `link`. |
| Remote OK | `https://remoteok.com/api` | Each job record contains `id`, `position`, `company`, `description`, `date`, and `url`. |
| Remotive | `https://remotive.com/remote-jobs/feed` | RSS items contain `jobId`, `title`, `company`, `location`, `description`, `pubDate`, and `link`. |
| Working Nomads | `https://www.workingnomads.com/api/exposed_jobs/` | Records contain `url`, `title`, `company_name`, `description`, `pub_date`, and `location`. |
| Jobicy | `https://jobicy.com/api/v2/remote-jobs?count=50` | Records contain `id`, `url`, `jobTitle`, `companyName`, `jobDescription`, `pubDate`, and `jobGeo`. |

The supported feeds put full posting text in the list response. The CLI's
`detail` command refetches the relevant feed and selects the matching stable ID
or posting URL. Himalayas detail lookup uses its keyword-search endpoint because
the public posting page is not a detail API. This avoids scraping a second HTML
page for data the feeds already provide.

## Access notes

- Keep requests low-volume and personal-use only.
- Remote OK asks clients to link back to the source and documents a crawl delay
  in its robots file.
- Himalayas, Remote OK, and Jobicy request source attribution or a backlink.
- Remotive's RSS feed is the supported endpoint. Its JSON API is not used.
- Feed pages are locally filtered for query, location, recency, and workplace
  mode. The feed-specific result limits remain in force.
