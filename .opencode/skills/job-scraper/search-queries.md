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

Sourced from the "100 European Tech Companies — Visa Sponsorship" sheet. Sponsorship claims must be re-verified per posting before applying (EU Blue Card / Irish Critical Skills / UK Skilled Worker paths).

```
site:deliveryhero.com "Backend" OR "Software Engineer" OR "Go" 
site:contentful.com "Software Engineer" OR "Backend"
site:getyourguide.com "Software Engineer" OR "Backend"
site:sumup.com "Backend" OR "Software Engineer"
site:monzo.com "Software Engineer" OR "Backend" OR "Go"
site:deliveroo.com "Software Engineer" OR "Backend"
site:wise.com "Backend" OR "Software Engineer"
site:trustpilot.com "Software Engineer" OR "Backend"
site:wolt.com "Backend" OR "Software Engineer"
site:glovoapp.com "Backend" OR "Software Engineer"
site:ovhcloud.com "Backend" OR "Go" OR "Software Engineer"
site:blablacar.com "Backend" OR "Software Engineer"
site:unbabel.com "Machine Learning" OR "NLP" OR "Backend"
site:feedzai.com "Machine Learning" OR "Backend"
site:celonis.com "Data Engineer" OR "Backend" OR "Software Engineer"
site:zalando.com "Backend" OR "Software Engineer" OR "Python"
site:personio.com "Backend" OR "Software Engineer" OR "TypeScript"
```

#### Remote-first target companies

Verified remote-first orgs (from the 100%-remote and Remotive lists) with ongoing remote openings.

```
site:about.gitlab.com "Remote" OR "Backend" OR "Engineer"
site:automattic.com "Engineer" OR "Backend"
site:buffer.com "Engineer" OR "Backend"
site:doist.com "Engineer" OR "Backend"
site:duckduckgo.com "Engineer" OR "Backend"
site:kinsta.com "Engineer" OR "Backend"
site:testgorilla.com "Engineer" OR "Backend"
site:octopus.com "Engineer" OR "Backend"
site:huntress.com "Software Engineer" OR "Backend"
site:socket.dev "Engineer" OR "Backend"
```

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
- **On-site outside Ethiopia** (too far - requires relocation)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
