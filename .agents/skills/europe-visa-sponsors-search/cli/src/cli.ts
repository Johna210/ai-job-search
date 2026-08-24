#!/usr/bin/env bun
// Self-contained CLI for searching live job listings at European tech companies
// with documented visa-sponsorship practice. Reads each company's public careers
// API (Greenhouse, Lever, Ashby, or SmartRecruiters) — no authentication, no API
// keys, no dependencies beyond `bun`.
//
// Sponsorship history comes from a curated list. It is not a promise for any
// specific opening: always check the posting's own sponsorship language before
// applying.

export {}

type Ats = "greenhouse" | "lever" | "ashby" | "smartrecruiters"

interface Company {
  key: string
  name: string
  ats: Ats
  token: string
  country: string
}

// Verified against each platform's public API on 2026-08-24.
// Companies whose careers site has no public API are not listed here; they are
// covered by the WebSearch fallback in search-queries.md instead.
const COMPANIES: Company[] = [
  { key: "contentful", name: "Contentful", ats: "greenhouse", token: "contentful", country: "Germany" },
  { key: "getyourguide", name: "GetYourGuide", ats: "greenhouse", token: "getyourguide", country: "Germany" },
  { key: "sumup", name: "SumUp", ats: "greenhouse", token: "sumup", country: "Germany" },
  { key: "monzo", name: "Monzo", ats: "greenhouse", token: "monzo", country: "UK" },
  { key: "wise", name: "Wise", ats: "greenhouse", token: "wise", country: "UK" },
  { key: "wolt", name: "Wolt", ats: "greenhouse", token: "wolt", country: "Finland" },
  { key: "feedzai", name: "Feedzai", ats: "greenhouse", token: "feedzai", country: "Portugal" },
  { key: "celonis", name: "Celonis", ats: "greenhouse", token: "celonis", country: "Germany" },
  { key: "deliveroo", name: "Deliveroo", ats: "ashby", token: "deliveroo", country: "UK" },
  { key: "blablacar", name: "BlaBlaCar", ats: "lever", token: "blablacar", country: "France" },
  { key: "deliveryhero", name: "Delivery Hero", ats: "smartrecruiters", token: "deliveryhero", country: "Germany" },
  { key: "trustpilot", name: "Trustpilot", ats: "smartrecruiters", token: "trustpilot", country: "Denmark" },
  { key: "glovo", name: "Glovo", ats: "smartrecruiters", token: "glovo", country: "Spain" },
  { key: "ovhcloud", name: "OVHcloud", ats: "smartrecruiters", token: "ovhcloud", country: "France" },
  { key: "zalando", name: "Zalando", ats: "smartrecruiters", token: "zalando", country: "Germany" },
  { key: "unbabel", name: "Unbabel", ats: "smartrecruiters", token: "unbabel", country: "Portugal" },
]

interface Job {
  id: string
  title: string
  company: string
  country: string
  location: string
  url: string
  updated: string
  remote: boolean
}

interface FetchError {
  company: string
  error: string
}

const UA = "job-search-skill (personal use; repo-local CLI)"

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return res.json()
}

function stripHtml(html: string): string {
  // Decode entities first: Greenhouse and SmartRecruiters return the content
  // HTML-entity-encoded, so tags only become strippable after decoding.
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function fetchGreenhouse(c: Company): Promise<Job[]> {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.token}/jobs?content=false`)
  return (data.jobs ?? []).map((j: any) => ({
    id: String(j.id ?? ""),
    title: j.title ?? "",
    company: c.name,
    country: c.country,
    location: j.location?.name ?? "",
    url: j.absolute_url ?? "",
    updated: j.updated_at ?? "",
    remote: /remote|work from home|anywhere/i.test(j.location?.name ?? ""),
  }))
}

async function fetchLever(c: Company): Promise<Job[]> {
  const data = await getJson(`https://api.lever.co/v0/postings/${c.token}?mode=json`)
  return (Array.isArray(data) ? data : []).map((j: any) => ({
    id: String(j.id ?? ""),
    title: j.text ?? "",
    company: c.name,
    country: c.country,
    location: j.categories?.location ?? "",
    url: j.hostedUrl ?? "",
    updated: j.createdAt ? new Date(j.createdAt).toISOString() : "",
    remote: /remote|work from home|anywhere/i.test(j.categories?.location ?? ""),
  }))
}

async function fetchAshby(c: Company): Promise<Job[]> {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.token}`)
  return (data.jobs ?? [])
    .filter((j: any) => j.isListed !== false)
    .map((j: any) => ({
      id: String(j.id ?? ""),
      title: j.title ?? "",
      company: c.name,
      country: c.country,
      location: j.location ?? "",
      url: j.jobUrl ?? "",
      updated: j.updatedAt ?? j.publishedAt ?? "",
      remote: j.isRemote === true || /remote|anywhere/i.test(j.location ?? ""),
    }))
}

async function fetchSmartRecruiters(c: Company, query?: string): Promise<Job[]> {
  const params = new URLSearchParams({ limit: "100" })
  if (query) params.set("q", query)
  const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${c.token}/postings?${params}`)
  return (data.content ?? []).map((j: any) => ({
    id: String(j.id ?? ""),
    title: j.name ?? "",
    company: c.name,
    country: c.country,
    location: j.location?.fullLocation || [j.location?.city, j.location?.country].filter(Boolean).join(", "),
    url: `https://jobs.smartrecruiters.com/${c.token}/${j.id}`,
    updated: j.releasedDate ?? "",
    remote: j.location?.remote === true,
  }))
}

async function fetchCompany(c: Company, query?: string): Promise<Job[]> {
  switch (c.ats) {
    case "greenhouse":
      return fetchGreenhouse(c)
    case "lever":
      return fetchLever(c)
    case "ashby":
      return fetchAshby(c)
    case "smartrecruiters":
      return fetchSmartRecruiters(c, query)
  }
}

async function detailGreenhouse(c: Company, id: string): Promise<string> {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.token}/jobs/${id}`)
  return stripHtml(String(data.content ?? ""))
}

async function detailLever(c: Company, id: string): Promise<string> {
  const data = await getJson(`https://api.lever.co/v0/postings/${c.token}?mode=json`)
  const job = (Array.isArray(data) ? data : []).find((j: any) => j.id === id)
  if (!job) throw new Error(`job ${id} not found at ${c.name}`)
  return [job.descriptionPlain, job.additionalPlain].filter(Boolean).join("\n\n")
}

async function detailAshby(c: Company, id: string): Promise<string> {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.token}`)
  const job = (data.jobs ?? []).find((j: any) => j.id === id)
  if (!job) throw new Error(`job ${id} not found at ${c.name}`)
  return stripHtml(String(job.descriptionHtml ?? job.descriptionPlain ?? ""))
}

async function detailSmartRecruiters(c: Company, id: string): Promise<string> {
  const data = await getJson(`https://api.smartrecruiters.com/v1/companies/${c.token}/postings/${id}`)
  const sections = data.jobAd?.sections ?? {}
  const parts = Object.values(sections)
    .map((s: any) => (typeof s?.text === "string" ? stripHtml(s.text) : ""))
    .filter(Boolean)
  if (parts.length === 0) throw new Error(`no description available for ${id} at ${c.name}`)
  return parts.join("\n\n")
}

async function fetchDetail(c: Company, id: string): Promise<string> {
  switch (c.ats) {
    case "greenhouse":
      return detailGreenhouse(c, id)
    case "lever":
      return detailLever(c, id)
    case "ashby":
      return detailAshby(c, id)
    case "smartrecruiters":
      return detailSmartRecruiters(c, id)
  }
}

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[] | undefined
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", c: "company", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || (a.startsWith("-") && a.length > 1)) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

function resolveCompanies(selector: string | undefined): Company[] {
  if (!selector || selector === "all") return COMPANIES
  const key = selector.toLowerCase().replace(/[^a-z0-9]/g, "")
  const match = COMPANIES.find((c) => c.key === key)
  if (!match) {
    const known = COMPANIES.map((c) => c.key).join(", ")
    process.stderr.write(
      JSON.stringify({ error: `unknown company "${selector}". Known keys: ${known}`, code: "UNKNOWN_COMPANY" }) + "\n",
    )
    process.exit(1)
  }
  return [match]
}

function filterJobs(jobs: Job[], opts: { query?: string; jobage?: number; remoteOnly: boolean }): Job[] {
  let out = jobs
  const q = opts.query?.toLowerCase().trim()
  if (q) {
    const terms = q.split(/\s+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    out = out.filter((j) => {
      const hay = `${j.title} ${j.location}`.toLowerCase()
      return terms.every((t) => new RegExp(`\\b${t}`).test(hay))
    })
  }
  if (opts.remoteOnly) out = out.filter((j) => j.remote)
  if (opts.jobage && opts.jobage > 0) {
    const cutoff = Date.now() - opts.jobage * 24 * 60 * 60 * 1000
    out = out.filter((j) => {
      const t = Date.parse(j.updated)
      return Number.isFinite(t) ? t >= cutoff : false
    })
  }
  const seen = new Set<string>()
  out = out.filter((j) => {
    const key = j.url || `${j.company}:${j.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  out.sort((a, b) => (Date.parse(b.updated) || 0) - (Date.parse(a.updated) || 0))
  return out
}

function formatTable(jobs: Job[]): string {
  const upd = (j: Job) => (j.updated ? j.updated.slice(0, 10) : "?")
  const w = [4, 12, 34, 24, 10]
  const row = (cells: string[]) => cells.map((s, i) => s.padEnd(w[i])).join("  ").trimEnd()
  const lines = [row(["#", "Company", "Title", "Location", "Updated"])]
  jobs.forEach((j, i) => {
    const title = j.title.length > w[2] ? j.title.slice(0, w[2] - 1) + "…" : j.title
    const loc = j.location.length > w[3] ? j.location.slice(0, w[3] - 1) + "…" : j.location
    lines.push(row([String(i + 1), j.company, title, loc, upd(j)]))
  })
  return lines.join("\n")
}

function formatPlain(jobs: Job[]): string {
  return jobs
    .map((j) => `${j.title}\n  ${j.company} | ${j.location}${j.remote ? " | remote" : ""}\n  updated: ${j.updated || "?"}\n  ${j.url}`)
    .join("\n\n")
}

const HELP = `europe-visa-sponsors-cli — search live jobs at European tech companies
that sponsor work visas (EU Blue Card, Dutch HSM, Irish Critical Skills,
UK Skilled Worker and similar routes).

USAGE
  bun run src/cli.ts search [--company <key|all>] [flags]
  bun run src/cli.ts detail --company <key> <id>
  bun run src/cli.ts companies

SEARCH FLAGS
  --company, -c <key|all>  One company key, or all (default: all). See the companies command.
  --query, -q <text>       Keywords matched against title and location.
  --jobage <days>          Only jobs updated in the last N days. Default: all.
  --remote                 Only jobs flagged remote by the company.
  --limit, -n <n>          Cap results. Default 50.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "backend go"
  bun run src/cli.ts search -c monzo -q "engineer" --jobage 14 --format table
  bun run src/cli.ts search -q "python" --remote -n 20
  bun run src/cli.ts companies
  bun run src/cli.ts detail -c monzo 1234567

Sponsorship history is per company, not per posting. Check the posting's own
sponsorship language before applying.
`

async function runSearch(flags: Flags): Promise<number> {
  const selector = typeof flags.company === "string" ? flags.company : "all"
  const targets = resolveCompanies(selector)
  const query = typeof flags.query === "string" ? flags.query : undefined
  const jobage = typeof flags.jobage === "string" ? parseInt(flags.jobage, 10) : undefined
  const remoteOnly = flags.remote === true
  const limit = typeof flags.limit === "string" ? parseInt(flags.limit, 10) || 50 : 50
  const format = typeof flags.format === "string" ? flags.format : "json"

  const settled = await Promise.allSettled(targets.map((c) => fetchCompany(c, query)))
  const jobs: Job[] = []
  const errors: FetchError[] = []
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") jobs.push(...r.value)
    else errors.push({ company: targets[i].name, error: String((r.reason as Error)?.message ?? r.reason) })
  })

  const filtered = filterJobs(jobs, { query, jobage, remoteOnly }).slice(0, limit)

  for (const e of errors) {
    process.stderr.write(JSON.stringify({ warning: `${e.company}: ${e.error}` }) + "\n")
  }

  if (format === "table") {
    process.stdout.write(formatTable(filtered) + "\n")
  } else if (format === "plain") {
    process.stdout.write((filtered.length ? formatPlain(filtered) : "no matching jobs") + "\n")
  } else {
    process.stdout.write(
      JSON.stringify(
        {
          query: query ?? null,
          count: filtered.length,
          companies_searched: targets.length,
          companies_failed: errors.length,
          jobs: filtered,
          ...(errors.length > 0 ? { errors } : {}),
        },
        null,
        2,
      ) + "\n",
    )
  }

  if (errors.length === targets.length && targets.length > 0) {
    process.stderr.write(JSON.stringify({ error: "all companies failed", code: "ALL_FAILED" }) + "\n")
    return 1
  }
  return 0
}

async function runDetail(flags: Flags): Promise<number> {
  const id = (flags._ as string[])[1]
  const selector = typeof flags.company === "string" ? flags.company : undefined
  if (!id || !selector) {
    process.stderr.write(
      JSON.stringify({ error: "usage: detail --company <key> <id>", code: "BAD_USAGE" }) + "\n",
    )
    return 1
  }
  const [company] = resolveCompanies(selector)
  try {
    const text = await fetchDetail(company, id)
    process.stdout.write(text + "\n")
    return 0
  } catch (err) {
    process.stderr.write(JSON.stringify({ error: String((err as Error)?.message ?? err), code: "DETAIL_FAILED" }) + "\n")
    return 1
  }
}

function runCompanies(): number {
  for (const c of COMPANIES) {
    process.stdout.write(`${c.key.padEnd(14)} ${c.ats.padEnd(16)} ${c.country.padEnd(10)} ${c.name}\n`)
  }
  return 0
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]
  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }
  if (cmd === "search") return runSearch(flags)
  if (cmd === "detail") return runDetail(flags)
  if (cmd === "companies") return runCompanies()
  process.stderr.write(JSON.stringify({ error: `unknown command "${cmd}"`, code: "UNKNOWN_COMMAND" }) + "\n")
  return 1
}

process.exitCode = await main()
