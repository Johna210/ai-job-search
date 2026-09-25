import { fetchText } from "../../../../lib/direct-careers/http.ts"
import { htmlToText, parsedDate } from "../../../../lib/direct-careers/parsing.ts"
import type { SearchOptions } from "../../../../lib/direct-careers/types.ts"

const CHANNEL_URL = "https://t.me/s/freelance_ethio"
const MAX_SOURCE_PAGES = 5
const PAGE_SIZE = 20

export type Description =
  | { readonly kind: "missing"; readonly text: null }
  | { readonly kind: "as-posted"; readonly text: string }
  | { readonly kind: "excerpt"; readonly text: string }

export interface AfriworkJob {
  readonly id: string
  readonly title: string
  readonly company: string | null
  readonly location: string | null
  readonly date: string | null
  readonly url: string
  readonly applyUrl: string | null
  readonly employmentType: string | null
  readonly workplaceType: "remote" | "hybrid" | "onsite" | null
  readonly remote: boolean | null
  readonly deadline: string | null
  readonly salary: string | null
  readonly applicantsNeeded: string | null
  readonly description: Description
  readonly closed: boolean
}

export interface AfriworkCard {
  readonly id: string
  readonly title: string
  readonly company: string | null
  readonly location: string | null
  readonly date: string | null
  readonly url: string
  readonly applyUrl: string | null
  readonly employmentType: string | null
  readonly workplaceType: AfriworkJob["workplaceType"]
  readonly remote: boolean | null
  readonly deadline: string | null
  readonly salary: string | null
  readonly detailsMayBeTruncated: true
}

export interface AfriworkDetail extends AfriworkCard {
  readonly description: string | null
  readonly descriptionStatus: Description["kind"]
  readonly applicantsNeeded: string | null
  readonly closed: boolean
}

export interface AfriworkSearchResult {
  readonly results: readonly AfriworkCard[]
  readonly total: number
  readonly sourcePages: number
  readonly hasMore: boolean
}

interface ChannelPage {
  readonly jobs: readonly AfriworkJob[]
  readonly nextCursor: string | null
}

export function parseChannelPage(html: string): ChannelPage {
  const starts = Array.from(
    html.matchAll(/<div class="tgme_widget_message_wrap\b[^>]*>/gi),
    (match) => match.index,
  ).filter((index): index is number => index !== undefined)
  const jobs = starts.flatMap((start, index) => {
    const end = starts[index + 1] ?? html.length
    const chunk = html.slice(start, end)
    const postId = chunk.match(/data-post="freelance_ethio\/(\d+)"/i)?.[1]
    if (!postId) return []
    const job = parseChannelPost(postId, chunk)
    return job ? [job] : []
  })

  return { jobs, nextCursor: cursorFrom(html) }
}

export async function searchAfriwork(options: SearchOptions, now = Date.now()): Promise<AfriworkSearchResult> {
  const pageSize = options.limit ?? 25
  const requiredResults = options.page * pageSize
  if (requiredResults > MAX_SOURCE_PAGES * PAGE_SIZE) {
    throw new Error(`The five-page search cap supports at most ${MAX_SOURCE_PAGES * PAGE_SIZE} results. Lower --page or --limit.`)
  }
  const jobs = new Map<string, AfriworkJob>()
  const seenCursors = new Set<string>()
  let cursor: string | null = null
  let sourcePages = 0
  let hasMore = false

  for (let page = 0; page < MAX_SOURCE_PAGES; page++) {
    const html = await fetchText(channelPageUrl(cursor))
    if (html === null) throw new Error("Afriwork channel returned 404")

    const channelPage = parseChannelPage(html)
    if (channelPage.jobs.length === 0) throw new Error("Afriwork returned no parseable job posts")
    sourcePages++
    for (const job of channelPage.jobs) jobs.set(job.id, job)

    const matches = filteredJobs([...jobs.values()], options, now)
    const nextCursor = channelPage.nextCursor
    hasMore = nextCursor !== null
    if (matches.length >= requiredResults || nextCursor === null) break
    if (seenCursors.has(nextCursor)) throw new Error("Afriwork pagination cursor did not advance")
    seenCursors.add(nextCursor)
    cursor = nextCursor
  }

  const matches = filteredJobs([...jobs.values()], options, now)
  const start = (options.page - 1) * pageSize
  return {
    results: matches.slice(start, start + pageSize).map(toCard),
    total: matches.length,
    sourcePages,
    hasMore,
  }
}

export async function detailAfriwork(input: string): Promise<AfriworkDetail> {
  const postId = postIdFrom(input)
  const html = await fetchText(`${CHANNEL_URL}/${postId}`)
  if (html === null) throw new Error(`Afriwork post ${postId} returned 404`)

  const job = parseChannelPage(html).jobs.find((candidate) => candidate.id === `afriwork:${postId}`)
  if (!job) throw new Error(`Afriwork post ${postId} was not found in the public channel preview`)
  return toDetail(job)
}

export function filteredJobs(jobs: readonly AfriworkJob[], options: SearchOptions, now = Date.now()): AfriworkJob[] {
  const cutoff = now - options.jobage * 24 * 60 * 60 * 1000
  return jobs
    .filter((job) => !job.closed)
    .filter((job) => matchesQuery(job, options.query))
    .filter((job) => !options.location || normalize(job.location ?? "").includes(normalize(options.location)))
    .filter((job) => matchesAge(job, cutoff, now))
    .filter((job) => matchesWorkplace(job, options))
    .sort((left, right) => timestamp(right.date) - timestamp(left.date))
}

function matchesQuery(job: AfriworkJob, query: string | undefined): boolean {
  if (!query) return true
  const terms = queryTerms(query)
  if (terms.length === 0) return false
  const text = normalize([
    job.title,
    job.company,
    job.location,
    job.employmentType,
    job.salary,
    job.description.text,
  ].filter((value): value is string => value !== null).join(" "))
  return terms.every((term) => text.includes(term))
}

function matchesAge(job: AfriworkJob, cutoff: number, now: number): boolean {
  const deadline = deadlineTimestamp(job.deadline)
  if (deadline !== 0 && deadline < now) return false
  if (cutoff === 0) return true

  const posted = timestamp(job.date)
  return posted === 0 || posted >= cutoff || (deadline !== 0 && deadline >= now)
}

function matchesWorkplace(job: AfriworkJob, options: SearchOptions): boolean {
  if (!options.remote) return true
  return job.workplaceType === options.remote
}

function parseChannelPost(postId: string, chunk: string): AfriworkJob | null {
  const body = chunk.match(/<div class="tgme_widget_message_text\b[^>]*>([\s\S]*?)<\/div>/i)?.[1]
  if (!body) return null
  const text = htmlToText(body)
  if (!text) return null
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean)
  const title = firstField(lines, ["Job Title", "Position", "Title"])
  if (!title) return null

  const jobType = firstField(lines, ["Job Type", "Employment Type"])
  const workplaceType = parseWorkplaceType(jobType)
  const dateValue = chunk.match(/<time\b[^>]*datetime="([^"]+)"/i)?.[1]

  return {
    id: `afriwork:${postId}`,
    title,
    company: companyFrom(lines) ?? firstField(lines, ["Company", "Company Name"]),
    location: firstField(lines, ["Work Location", "Location"]),
    date: dateValue ? parsedDate(dateValue).text : null,
    url: `https://t.me/freelance_ethio/${postId}`,
    applyUrl: applicationUrl(chunk),
    employmentType: jobType,
    workplaceType,
    remote: workplaceType === "remote" ? true : workplaceType ? false : null,
    deadline: parseAfriworkDate(firstField(lines, ["Deadline", "Application Deadline"])),
    salary: firstField(lines, ["Salary/Compensation", "Salary", "Compensation"]),
    applicantsNeeded: firstField(lines, ["Applicants Needed"]),
    description: descriptionFrom(lines),
    closed: /\bCLOSED\b/i.test(headerText(lines)),
  }
}

function firstField(lines: readonly string[], labels: readonly string[]): string | null {
  const accepted = new Set(labels.map(normalize))
  for (const line of lines) {
    const separator = line.indexOf(":")
    if (separator < 0) continue
    const label = normalize(line.slice(0, separator))
    if (!accepted.has(label)) continue
    const value = line.slice(separator + 1).trim()
    if (value) return value
  }
  return null
}

function companyFrom(lines: readonly string[]): string | null {
  const jobsPostedIndex = lines.findIndex((line) => /^\d+\s+Jobs Posted$/i.test(line))
  if (jobsPostedIndex >= 0) {
    for (let index = jobsPostedIndex - 1; index >= 0; index--) {
      const candidate = lines[index]?.trim()
      if (!candidate || /^Verified Company/i.test(candidate) || /^_+$/.test(candidate)) continue
      return candidate
    }
  }
  return null
}

function descriptionFrom(lines: readonly string[]): Description {
  let start = -1
  let firstLine = ""
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ""
    const match = line.match(/^(?:Job\s+)?(?:Description|Job Summary)\s*:\s*(.*)$/i)
    if (match) {
      start = index + 1
      firstLine = match[1]?.trim() ?? ""
      break
    }
  }
  if (start < 0) return { kind: "missing", text: null }

  const body = [firstLine, ...lines.slice(start)]
  const descriptionLines: string[] = []
  for (const line of body) {
    if (isPostFooter(line)) break
    descriptionLines.push(line)
  }
  const text = descriptionLines.filter(Boolean).join("\n").trim()
  if (!text) return { kind: "missing", text: null }
  return isExcerpt(text) ? { kind: "excerpt", text } : { kind: "as-posted", text }
}

function isPostFooter(line: string): boolean {
  return /^_{3,}$/.test(line) || /^From\s*:/i.test(line) || /^\d+\s+Jobs Posted$/i.test(line) ||
    /^Verified Company\b/i.test(line) || /^Private Client$/i.test(line)
}

function isExcerpt(text: string): boolean {
  return /(?:\.\.\.|…)[\s\S]*(?:view details|see more)|view details below/i.test(text)
}

function headerText(lines: readonly string[]): string {
  const descriptionIndex = lines.findIndex((line) => /^(?:Job\s+)?(?:Description|Job Summary)\s*:/i.test(line))
  return (descriptionIndex >= 0 ? lines.slice(0, descriptionIndex) : lines).join(" ")
}

function parseWorkplaceType(value: string | null): AfriworkJob["workplaceType"] {
  if (!value) return null
  if (/\bremote\b/i.test(value)) return "remote"
  if (/\bhybrid\b/i.test(value)) return "hybrid"
  if (/\bon[\s-]?site\b/i.test(value)) return "onsite"
  return null
}

function parseAfriworkDate(value: string | null): string | null {
  if (!value) return null
  const normalized = value.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1")
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  const match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/)
  if (!match) return parsedDate(normalized).text

  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
  const month = months.indexOf((match[1] ?? "").toLocaleLowerCase())
  const day = Number(match[2])
  const year = Number(match[3])
  if (month < 0 || day < 1 || day > 31 || year < 1) return value

  const parsed = new Date(Date.UTC(year, month, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) return value
  return parsed.toISOString().slice(0, 10)
}

function applicationUrl(chunk: string): string | null {
  const links = Array.from(chunk.matchAll(/href="([^"]+)"/gi), (match) => match[1]).filter(
    (value): value is string => value !== undefined,
  )
  for (const rawLink of links) {
    const decoded = htmlToText(rawLink)
    if (!decoded) continue
    try {
      const url = new URL(decoded, "https://t.me")
      const startApp = url.searchParams.get("startapp")
      if (
        url.origin === "https://t.me" &&
        url.username === "" &&
        url.password === "" &&
        url.pathname === "/afriworkapplicantbot/applicantapp" &&
        startApp !== null &&
        startApp.trim().length > 0
      ) {
        return url.toString()
      }
    } catch {
      continue
    }
  }
  return null
}

function cursorFrom(html: string): string | null {
  const links = Array.from(html.matchAll(/href="([^"]*\?before=\d+[^\"]*)"/gi), (match) => match[1]).filter(
    (value): value is string => value !== undefined,
  )
  for (const rawLink of links) {
    const decoded = htmlToText(rawLink)
    if (!decoded) continue
    try {
      const url = new URL(decoded, "https://t.me")
      const cursor = url.searchParams.get("before")
      if (url.hostname === "t.me" && url.pathname === "/s/freelance_ethio" && cursor && /^\d+$/.test(cursor)) {
        return cursor
      }
    } catch {
      continue
    }
  }
  return null
}

function channelPageUrl(cursor: string | null): string {
  if (cursor === null) return CHANNEL_URL
  const url = new URL(CHANNEL_URL)
  url.searchParams.set("before", cursor)
  return url.toString()
}

function postIdFrom(input: string): string {
  const idMatch = input.trim().match(/^afriwork:(\d{1,20})$/i)
  if (idMatch?.[1]) return idMatch[1]

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error("Use an Afriwork ID such as afriwork:103757 or a public channel post URL")
  }
  if (url.origin !== "https://t.me" || url.username !== "" || url.password !== "") {
    throw new Error("Unsupported Afriwork URL")
  }
  const parts = url.pathname.split("/").filter(Boolean)
  const id = parts.length === 3 && parts[0] === "s" && parts[1] === "freelance_ethio" ? parts[2] :
    parts.length === 2 && parts[0] === "freelance_ethio" ? parts[1] : undefined
  if (id && /^\d{1,20}$/.test(id)) return id
  throw new Error("Use an Afriwork ID such as afriwork:103757 or a public channel post URL")
}

function toCard(job: AfriworkJob): AfriworkCard {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    date: job.date,
    url: job.url,
    applyUrl: job.applyUrl,
    employmentType: job.employmentType,
    workplaceType: job.workplaceType,
    remote: job.remote,
    deadline: job.deadline,
    salary: job.salary,
    detailsMayBeTruncated: true,
  }
}

function toDetail(job: AfriworkJob): AfriworkDetail {
  return {
    ...toCard(job),
    description: job.description.text,
    descriptionStatus: job.description.kind,
    applicantsNeeded: job.applicantsNeeded,
    closed: job.closed,
  }
}

function queryTerms(value: string): string[] {
  return value.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase()
}

function timestamp(value: string | null): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function deadlineTimestamp(value: string | null): number {
  const parsed = timestamp(value)
  if (!parsed || !value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return parsed
  return parsed + 24 * 60 * 60 * 1000 - 1
}
