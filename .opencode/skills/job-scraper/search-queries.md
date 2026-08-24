# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`; Danish demos and any skill you add with `/add-portal` are included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

## Search Sites

Primary:
- **linkedin.com/jobs** - LinkedIn job listings (filter: Ethiopia / Addis Ababa / Remote); also covered by `linkedin-search` CLI
- **upwork.com** - Freelance and contract opportunities
- **turing.com** - Remote software engineering roles
- **toptal.com** - Top-tier freelance talent network
- **lennysjobs.com** - Curated startup job listings (remote and on-site)
- **adzuna.co.uk** - Worldwide job search aggregator with Remote / Work From Home filters
- **andela.com** - Global remote tech talent platform (remote-first roles, strong track record for Africa-based developers)
- **crossover.com** - Remote technology job marketplace (roles across engineering, product, and operations)

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for known target companies

#### Europe — visa sponsors (fresher-friendly, backend/AI stack)

Most of this group is covered by the `europe-visa-sponsors-search` CLI skill (16 companies via Greenhouse, Lever, Ashby, and SmartRecruiters APIs). The `site:` lines below are only for companies whose careers site has no public API. Sponsorship claims must be re-verified per posting before applying.

```
site:personio.com "Backend" OR "Software Engineer" OR "TypeScript"
```

#### Remote-first target companies

Fully covered by the `remote-first-targets-search` CLI skill (GitLab, Automattic, Buffer, Doist, DuckDuckGo, Kinsta, TestGorilla, Octopus Deploy, Huntress, Socket). No `site:` fallback lines needed.

## Query Categories

Queries are grouped by priority. Each query should be combined with your location terms (e.g. your city, region, or metro area) where the site supports it.

### Priority 1: AI/ML Engineer

These match your strongest and most desired career direction.

```
site:linkedin.com/jobs "AI Engineer" Ethiopia OR Remote
site:linkedin.com/jobs "ML Engineer" Ethiopia OR Remote
site:linkedin.com/jobs "RAG Engineer" Remote
site:linkedin.com/jobs "LLM Engineer" Remote
site:linkedin.com/jobs "Machine Learning Engineer" Ethiopia OR Remote
```

### Priority 2: Backend Engineer

These match your backend development expertise.

```
site:linkedin.com/jobs "Backend Developer" Go OR NestJS Ethiopia OR Remote
site:linkedin.com/jobs "Backend Engineer" Python OR Go Remote
site:linkedin.com/jobs "Software Engineer" Backend Ethiopia OR Remote
site:linkedin.com/jobs "API Developer" Remote
```

### Priority 3: Full-Stack Developer

Adjacent roles you could pivot into.

```
site:linkedin.com/jobs "Full Stack Developer" Next.js OR NestJS Ethiopia OR Remote
site:linkedin.com/jobs "Full Stack Engineer" Python OR TypeScript Remote
site:linkedin.com/jobs "Software Developer" Full Stack Ethiopia OR Remote
```

### Priority 4: Broader Technical

Wider net for general technical roles.

```
site:linkedin.com/jobs "Software Engineer" Python OR Go Ethiopia OR Remote
site:linkedin.com/jobs "Software Developer" Remote
site:linkedin.com/jobs "Technical Consultant" AI OR Backend Remote
```

## Location Filter

When evaluating results, verify the job location is within reasonable commute distance from your home or is remote. Define acceptable areas:
- **Remote** (preferred)
- **Addis Ababa, Ethiopia** (acceptable for on-site)
- **Africa-wide remote** (acceptable)
- **Global remote** (ideal)
- **Other cities in Ethiopia** (borderline - commute not feasible, remote only)
- **On-site outside Ethiopia** (acceptable ONLY with documented visa sponsorship - e.g. EU Blue Card, Dutch HSM, UK Skilled Worker; re-verify sponsorship per posting before applying)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
