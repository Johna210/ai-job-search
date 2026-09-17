import { fetchJson, fetchText, writeWarning } from "../direct-careers/http.ts"
import {
  booleanValue,
  htmlToText,
  inferRemote,
  isObject,
  normalizeSearchText,
  objectValue,
  parsedDate,
  textValue,
  type JsonObject,
} from "../direct-careers/parsing.ts"
import type { SearchOptions } from "../direct-careers/types.ts"
import {
  boardFor,
  boardForUrl,
  boardsFor,
  type CompanyBoard,
  type CompanyBoardFailure,
  type CompanyJobCard,
  type CompanyJobDetail,
  type CompanySearchResult,
} from "./types.ts"

interface JobReference {
  readonly board: CompanyBoard
  readonly id: string | null
  readonly url: string | null
}

interface JobFields {
  readonly id: string
  readonly title: string
  readonly company: string | null
  readonly location: string | null
  readonly date: string | null
  readonly url: string
  readonly applyUrl: string | null
  readonly remote: boolean | null
  readonly workplaceType: string | null
  readonly description: string | null
  readonly deadline: string | null
  readonly employmentType: string | null
}

interface ZalandoPage {
  readonly jobs: readonly CompanyJobDetail[]
  readonly total: number | null
}

export async function searchJobs(options: SearchOptions): Promise<CompanySearchResult> {
  const outcomes = await mapWithConcurrency(boardsFor(), 4, async (board) => {
    try {
      return { jobs: await fetchBoardJobs(board, options), failure: null }
    } catch (error) {
      return {
        jobs: [],
        failure: {
          board,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  })

  const failures = outcomes
    .map((outcome) => outcome.failure)
    .filter((failure): failure is CompanyBoardFailure => failure !== null)
  const jobs = uniqueByUrl(
    outcomes.flatMap((outcome) => outcome.jobs).filter((job) =>
      matchesSearch(job, options, Boolean(options.query) && (job.board === "zalando" || job.board === "ovhcloud")),
    ),
  ).sort((left, right) => dateScore(right.date) - dateScore(left.date))
  const pageSize = options.limit ?? 25
  const start = (options.page - 1) * pageSize

  return {
    results: jobs.slice(start, start + pageSize).map(toCard),
    total: jobs.length,
    failures,
  }
}

export async function detailJob(input: string): Promise<CompanyJobDetail> {
  const reference = resolveReference(input)
  switch (reference.board.id) {
    case "deliveroo":
      return detailDeliveroo(reference)
    case "zalando":
      return detailZalando(reference)
    case "ovhcloud":
      return detailOvhcloud(reference)
    case "automattic":
      return detailAutomattic(reference)
    default: {
      const exhaustive: never = reference.board.id
      throw new Error(`Unsupported company board ${exhaustive}`)
    }
  }
}

export function reportFailures(failures: readonly CompanyBoardFailure[]): void {
  if (failures.length === 0) return
  const details = failures.map((failure) => `${failure.board.id}: ${failure.message}`).join("; ")
  writeWarning(
    `${failures.length} company board${failures.length === 1 ? "" : "s"} failed; returned the remaining results (${details})`,
    "PARTIAL_FAILURE",
  )
}

async function fetchBoardJobs(board: CompanyBoard, options: SearchOptions): Promise<CompanyJobDetail[]> {
  switch (board.id) {
    case "deliveroo":
      return fetchDeliveroo(board)
    case "zalando":
      return fetchZalando(board, options.query, options.remote !== undefined)
    case "ovhcloud":
      return fetchOvhcloud(board, options.query)
    case "automattic":
      return fetchAutomattic(board)
    default: {
      const exhaustive: never = board.id
      throw new Error(`Unsupported company board ${exhaustive}`)
    }
  }
}

async function fetchDeliveroo(board: CompanyBoard): Promise<CompanyJobDetail[]> {
  const jobs: CompanyJobDetail[] = []
  const perPage = 100
  for (let page = 1; page <= 10; page++) {
    const url = new URL(`${board.endpoint}/wp-json/wp/v2/roles`)
    url.searchParams.set("per_page", String(perPage))
    url.searchParams.set("page", String(page))
    const payload = await fetchJson(url.toString())
    if (payload === null) throw new Error(`${board.company} board returned 404`)
    if (!Array.isArray(payload)) throw new Error(`${board.company} returned an invalid job list`)
    const records = payload.filter(isObject)
    const parsedJobs = records.map((record) => parseDeliveroo(record, board)).filter((job): job is CompanyJobDetail => job !== null)
    if (records.length > 0 && parsedJobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
    jobs.push(...parsedJobs)
    if (records.length < perPage) break
  }
  return jobs
}

async function enrichZalandoJobs(board: CompanyBoard, jobs: readonly CompanyJobDetail[]): Promise<CompanyJobDetail[]> {
  return mapWithConcurrency(jobs, 4, async (job) => {
    try {
      const payload = await fetchText(job.url)
      if (payload === null) return job
      return parseZalandoDetail(payload, board, job) ?? job
    } catch {
      return job
    }
  })
}

async function fetchZalando(board: CompanyBoard, query: string | undefined, includeWorkplaceDetails: boolean): Promise<CompanyJobDetail[]> {
  const jobs: CompanyJobDetail[] = []
  const seenFirstIds = new Set<string>()
  const firstPage = await fetchZalandoPage(board, query, 1)
  jobs.push(...firstPage.jobs)
  const firstId = firstPage.jobs[0]?.id
  if (firstId) seenFirstIds.add(firstId)

  const totalPages = firstPage.total === null ? null : Math.ceil(firstPage.total / ZALANDO_PAGE_SIZE)
  for (let page = 2; totalPages === null || page <= totalPages; page++) {
    const currentPage = await fetchZalandoPage(board, query, page)
    const currentFirstId = currentPage.jobs[0]?.id
    if (currentFirstId && seenFirstIds.has(currentFirstId)) break
    if (currentFirstId) seenFirstIds.add(currentFirstId)
    jobs.push(...currentPage.jobs)
    if (currentPage.jobs.length < ZALANDO_PAGE_SIZE) break
  }
  return includeWorkplaceDetails ? enrichZalandoJobs(board, jobs) : jobs
}

async function fetchOvhcloud(board: CompanyBoard, query: string | undefined): Promise<CompanyJobDetail[]> {
  const url = new URL(`${board.endpoint}/search/tile-search-results`)
  if (query) url.searchParams.set("q", query)
  url.searchParams.set("startrow", "0")
  const payload = await fetchText(url.toString())
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  const jobs = parseOvhcloudList(payload, board)
  if (jobs.length === 0) throw new Error(`${board.company} returned no parseable job cards`)
  return jobs
}

async function fetchAutomattic(board: CompanyBoard): Promise<CompanyJobDetail[]> {
  const payload = await fetchText(board.endpoint)
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  const jobs = parseAutomatticJobs(payload, board)
  if (jobs.length === 0) throw new Error(`${board.company} returned no parseable job records`)
  return jobs
}

export function parseDeliveroo(record: JsonObject, board: CompanyBoard): CompanyJobDetail | null {
  const id = textValue(record.id)
  const title = htmlField(record, "title", "rendered")
  const url = textValue(record.link)
  if (!id || !title || !url) return null

  const meta = objectValue(record, "meta")
  const location = textValue(meta?.ats_location) ?? textValue(meta?.ashby_location) ?? textValue(meta?.greenhouse_location)
  const remote = booleanValue(meta?.ats_remote) ?? booleanValue(meta?.ashby_remote) ?? booleanValue(meta?.greenhouse_remote)
  return buildJob(board, {
    id,
    title,
    company: board.company,
    location,
    date: parsedDate(firstPresent(record.modified, record.date)).text,
    url,
    applyUrl: null,
    remote,
    workplaceType: remote === true ? "remote" : remote === false ? "onsite" : null,
    description: htmlField(record, "content", "rendered"),
    deadline: null,
    employmentType: null,
  })
}

export function parseZalandoList(html: string, board: CompanyBoard): CompanyJobDetail[] {
  const jobs: CompanyJobDetail[] = []
  const seen = new Set<string>()
  const anchors = html.matchAll(/<a\b[^>]*href="(\/en\/jobs\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)
  for (const match of anchors) {
    const href = match[1]
    const inner = match[2] ?? ""
    const id = href?.match(/\/en\/jobs\/(\d+)/)?.[1]
    const title = tagText(inner, "h2")
    if (!href || !id || !title || seen.has(id)) continue
    const paragraphs = tagTexts(inner, "p")
    const url = new URL(href, board.endpoint).toString()
    seen.add(id)
    jobs.push(buildJob(board, {
      id,
      title,
      company: board.company,
      location: paragraphs[1] ?? null,
      date: zalandoUpdatedAt(html, id),
      url,
      applyUrl: null,
      remote: null,
      workplaceType: null,
      description: null,
      deadline: null,
      employmentType: null,
    }))
  }
  return jobs
}

export function parseOvhcloudList(html: string, board: CompanyBoard): CompanyJobDetail[] {
  const jobs: CompanyJobDetail[] = []
  const seen = new Set<string>()
  const tiles = html.matchAll(/<li\b[^>]*class="[^"]*\bjob-tile\b[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)
  for (const match of tiles) {
    const tile = match[0]
    const id = tile.match(/\bjob-id-(\d+)/)?.[1]
    const path = tile.match(/\bdata-url="([^"]+)"/)?.[1]
    const title = linkText(tile, "jobTitle-link")
    if (!id || !path || !title || seen.has(id)) continue
    const url = new URL(path, board.endpoint).toString()
    seen.add(id)
    jobs.push(buildJob(board, {
      id,
      title,
      company: board.company,
      location: elementText(tile, `job-${id}-desktop-section-multilocation-value`),
      date: null,
      url,
      applyUrl: null,
      remote: null,
      workplaceType: null,
      description: null,
      deadline: null,
      employmentType: elementText(tile, `job-${id}-desktop-section-customfield1-value`),
    }))
  }
  return jobs
}

export function parseAutomatticJobs(html: string, board: CompanyBoard): CompanyJobDetail[] {
  const records = automatticRecords(html)
  return records.map((record) => parseAutomattic(record, board)).filter((job): job is CompanyJobDetail => job !== null)
}

function parseAutomattic(record: JsonObject, board: CompanyBoard): CompanyJobDetail | null {
  const id = textValue(record.id)
  const title = textValue(record.title)
  const slug = textValue(record.slug)
  const url = textValue(record.href) ?? (slug ? `${board.endpoint}../job/${encodeURIComponent(slug)}/` : null)
  if (!id || !title || !url) return null

  return buildJob(board, {
    id,
    title,
    company: board.company,
    location: "Remote",
    date: null,
    url,
    applyUrl: url,
    remote: true,
    workplaceType: "remote",
    description: htmlToText(textValue(record.content)),
    deadline: null,
    employmentType: textValue(record.employmentType) ?? textValue(record.commitment),
  })
}

async function detailDeliveroo(reference: JobReference): Promise<CompanyJobDetail> {
  const endpoint = `${reference.board.endpoint}/wp-json/wp/v2/roles`
  const payload = reference.id
    ? await fetchJson(`${endpoint}/${encodeURIComponent(reference.id)}`)
    : await fetchJson(`${endpoint}?slug=${encodeURIComponent(lastPathPart(reference.url ?? ""))}`)
  const record = Array.isArray(payload) ? payload.find(isObject) : isObject(payload) ? payload : null
  const job = record ? parseDeliveroo(record, reference.board) : null
  if (!job) throw new Error(`The Deliveroo detail response did not contain a valid job`)
  return job
}

async function detailZalando(reference: JobReference): Promise<CompanyJobDetail> {
  const card = reference.url ? null : await findZalandoCard(reference.board, reference.id ?? "")
  const url = reference.url ?? card?.url
  if (!url) throw new Error(`No Zalando posting ${reference.id ?? "was found"}`)
  const payload = await fetchText(url)
  if (payload === null) throw new Error("The Zalando posting returned 404")
  const job = parseZalandoDetail(payload, reference.board, card)
  if (!job) throw new Error("The Zalando detail response did not contain a valid job")
  return job
}

async function detailOvhcloud(reference: JobReference): Promise<CompanyJobDetail> {
  const card = reference.url ? null : await findOvhcloudCard(reference.board, reference.id ?? "")
  const url = reference.url ?? card?.url
  if (!url) throw new Error(`No OVHcloud posting ${reference.id ?? "was found"}`)
  const payload = await fetchText(url)
  if (payload === null) throw new Error("The OVHcloud posting returned 404")
  const job = parseOvhcloudDetail(payload, reference.board, card)
  if (!job) throw new Error("The OVHcloud detail response did not contain a valid job")
  return job
}

async function detailAutomattic(reference: JobReference): Promise<CompanyJobDetail> {
  const payload = await fetchText(reference.board.endpoint)
  if (payload === null) throw new Error("The Automattic jobs page returned 404")
  const jobs = parseAutomatticJobs(payload, reference.board)
  const job = jobs.find((candidate) =>
    reference.id ? candidate.id === `${reference.board.id}:${reference.id}` : reference.url !== null && sameUrl(candidate.url, reference.url),
  )
  if (!job) throw new Error(`No Automattic posting ${reference.id ?? reference.url ?? "was found"}`)
  return job
}

async function findZalandoCard(board: CompanyBoard, id: string): Promise<CompanyJobDetail | null> {
  const seenFirstIds = new Set<string>()
  for (let page = 1; ; page++) {
    const currentPage = await fetchZalandoPage(board, undefined, page)
    const currentFirstId = currentPage.jobs[0]?.id
    if (currentFirstId && seenFirstIds.has(currentFirstId)) break
    if (currentFirstId) seenFirstIds.add(currentFirstId)
    const job = currentPage.jobs.find((candidate) => candidate.id === `${board.id}:${id}`)
    if (job) return job
    if (currentPage.jobs.length < ZALANDO_PAGE_SIZE) break
    if (currentPage.total !== null && page * ZALANDO_PAGE_SIZE >= currentPage.total) break
  }
  return null
}

const ZALANDO_PAGE_SIZE = 15

async function fetchZalandoPage(board: CompanyBoard, query: string | undefined, page: number): Promise<ZalandoPage> {
  const url = new URL(board.endpoint)
  if (query) url.searchParams.set("q", query)
  if (page > 1) url.searchParams.set("page", String(page))
  const payload = await fetchText(url.toString())
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  const jobs = parseZalandoList(payload, board)
  const total = zalandoTotal(payload)
  if (jobs.length === 0 && page === 1 && total !== 0) throw new Error(`${board.company} returned no parseable job cards`)
  return { jobs, total }
}

async function findOvhcloudCard(board: CompanyBoard, id: string): Promise<CompanyJobDetail | null> {
  const jobs = await fetchOvhcloud(board, undefined)
  return jobs.find((job) => job.id === `${board.id}:${id}`) ?? null
}

export function parseZalandoDetail(html: string, board: CompanyBoard, card: CompanyJobDetail | null): CompanyJobDetail | null {
  const title = tagText(html, "h1")
  const url = card?.url ?? canonicalUrl(html)
  const id = card?.id.split(":")[1] ?? url?.match(/\/jobs\/(\d+)/)?.[1]
  if (!title || !url || !id) return null

  const formEnd = html.indexOf("</form>")
  const footerStart = html.indexOf("<footer", formEnd >= 0 ? formEnd : 0)
  const descriptionStart = formEnd >= 0 ? formEnd + "</form>".length : 0
  const descriptionHtml = html.slice(descriptionStart, footerStart >= 0 ? footerStart : undefined)
  const description = htmlToText(descriptionHtml)
  const location = definitionText(html, "Location")
  const workplaceType = /\bhybrid\b/i.test(description ?? "") ? "hybrid" : null
  const remote = inferRemote(location, description, null, workplaceType)
  return buildJob(board, {
    id,
    title,
    company: board.company,
    location,
    date: card?.date ?? null,
    url,
    applyUrl: null,
    remote,
    workplaceType: workplaceType ?? (remote === true ? "remote" : null),
    description,
    deadline: null,
    employmentType: definitionText(html, "Contract"),
  })
}

function parseOvhcloudDetail(html: string, board: CompanyBoard, card: CompanyJobDetail | null): CompanyJobDetail | null {
  const id = card?.id.split(":")[1] ?? html.match(/itemprop="url"[^>]+content="[^"]*\/(\d+)\//i)?.[1]
  const title = metaContent(html, "property", "og:title")
  const url = canonicalUrl(html) ?? card?.url
  if (!id || !title || !url) return null

  const descriptionMarker = '<span class="jobdescription">'
  const descriptionStart = html.indexOf(descriptionMarker)
  const descriptionEnd = descriptionStart >= 0 ? html.indexOf("</span>\n    </span>", descriptionStart) : -1
  const description = descriptionStart >= 0
    ? htmlToText(html.slice(descriptionStart + descriptionMarker.length, descriptionEnd >= 0 ? descriptionEnd : undefined))
    : null
  const remote = false
  return buildJob(board, {
    id,
    title,
    company: board.company,
    location: metaContent(html, "itemprop", "streetAddress") ?? card?.location ?? null,
    date: parsedDate(metaContent(html, "itemprop", "datePosted")).text,
    url,
    applyUrl: absoluteUrl(html.match(/class="[^"]*dialogApplyBtn[^"]*"[^>]+href="([^"]+)"/i)?.[1], url),
    remote,
    workplaceType: "onsite",
    description,
    deadline: null,
    employmentType: card?.employmentType ?? null,
  })
}

function automatticRecords(html: string): JsonObject[] {
  const marker = "ghJobsData = "
  const start = html.indexOf(marker)
  if (start < 0) return []
  const dataStart = start + marker.length
  const dataEnd = html.indexOf("\n//# sourceURL", dataStart)
  if (dataEnd < 0) return []
  const raw = html.slice(dataStart, dataEnd).trim().replace(/;$/m, "")
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  return Array.isArray(value) ? value.filter(isObject) : []
}

function zalandoUpdatedAt(html: string, id: string): string | null {
  const marker = `\\"id\\":\\"${id}\\"`
  const start = html.indexOf(marker)
  if (start < 0) return null
  const snippet = html.slice(start, start + 600)
  const updatedMarker = '\\"updated_at\\":\\"'
  const updatedStart = snippet.indexOf(updatedMarker)
  if (updatedStart < 0) return null
  const valueStart = updatedStart + updatedMarker.length
  const valueEnd = snippet.indexOf('\\"', valueStart)
  return valueEnd >= 0 ? parsedDate(snippet.slice(valueStart, valueEnd)).text : null
}

function zalandoTotal(html: string): number | null {
  const match = html.match(/<(?:strong|span)\b[^>]*>\s*([\d,]+)\s*<\/(?:strong|span)>[\s\S]{0,100}?jobs match your criteria/i)
  if (!match?.[1]) return null
  const total = Number(match[1].replace(/,/g, ""))
  return Number.isInteger(total) ? total : null
}

function buildJob(board: CompanyBoard, fields: JobFields): CompanyJobDetail {
  return {
    ...fields,
    id: `${board.id}:${fields.id}`,
    source: "company",
    board: board.id,
  }
}

function htmlField(record: JsonObject, objectKey: string, fieldKey: string): string | null {
  return htmlToText(textValue(objectValue(record, objectKey)?.[fieldKey]))
}

function tagText(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return match ? htmlToText(match[1]) : null
}

function tagTexts(html: string, tag: string): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi")))
    .map((match) => htmlToText(match[1]))
    .filter((value): value is string => value !== null)
}

function linkText(html: string, className: string): string | null {
  const match = html.match(new RegExp(`<a\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</a>`, "i"))
  return match ? htmlToText(match[1]) : null
}

function elementText(html: string, id: string): string | null {
  const match = html.match(new RegExp(`<[^>]+id="${id}"[^>]*>([\\s\\S]*?)</(?:div|span)>`, "i"))
  return match ? htmlToText(match[1]) : null
}

function definitionText(html: string, label: string): string | null {
  const match = html.match(new RegExp(`<dt\\b[^>]*>\\s*${label}\\s*</dt>\\s*<dd\\b[^>]*>([\\s\\S]*?)</dd>`, "i"))
  return match ? htmlToText(match[1]) : null
}

function metaContent(html: string, attribute: string, value: string): string | null {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`<meta\\b[^>]*${attribute}="${escapedValue}"[^>]*content="([^"]*)"`, "i")
  const match = html.match(pattern)
  return match ? htmlToText(match[1]) : null
}

function canonicalUrl(html: string): string | null {
  const match = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)
  return match ? htmlToText(match[1]) : null
}

function absoluteUrl(value: string | undefined, base: string): string | null {
  if (!value) return null
  try {
    return new URL(value, base).toString()
  } catch {
    return null
  }
}

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null) ?? null
}

function lastPathPart(value: string): string {
  try {
    const parts = new URL(value).pathname.split("/").filter(Boolean)
    return parts.at(-1) ?? value
  } catch {
    return value
  }
}

function matchesSearch(job: CompanyJobDetail, options: SearchOptions, queryAlreadyApplied = false): boolean {
  if (options.query && !queryAlreadyApplied) {
    const searchText = normalizeSearchText(
      [job.title, job.company, job.location, job.description, job.workplaceType].filter(
        (value): value is string => value !== null,
      ).join(" "),
    )
    const terms = normalizeSearchText(options.query).split(" ").filter(Boolean)
    if (!terms.every((term) => searchText.includes(term))) return false
  }
  if (options.location && !normalizeSearchText(job.location ?? "").includes(normalizeSearchText(options.location))) return false

  if (options.jobage < 9999) {
    const timestamp = dateScore(job.date)
    const cutoff = Date.now() - options.jobage * 24 * 60 * 60 * 1000
    if (timestamp !== 0 && timestamp < cutoff) return false
  }

  if (options.remote === "remote" && job.remote !== true) return false
  if (options.remote === "hybrid" && !normalizeSearchText(job.workplaceType ?? "").includes("hybrid")) return false
  if (options.remote === "onsite" && (job.remote !== false || normalizeSearchText(job.workplaceType ?? "").includes("hybrid"))) return false
  return true
}

function dateScore(date: string | null): number {
  if (!date) return 0
  const timestamp = Date.parse(date)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function uniqueByUrl(jobs: readonly CompanyJobDetail[]): CompanyJobDetail[] {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const key = job.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toCard(job: CompanyJobDetail): CompanyJobCard {
  const { description: _description, deadline: _deadline, employmentType: _employmentType, ...card } = job
  return card
}

function resolveReference(input: string): JobReference {
  const value = input.trim()
  if (!value) throw new Error("A company job ID or URL is required")

  if (/^https?:\/\//i.test(value)) {
    const board = boardForUrl(value)
    if (!board) throw new Error("Could not identify a company board from the URL")
    return { board, id: null, url: value }
  }

  const separator = value.indexOf(":")
  if (separator > 0) {
    const board = boardFor(value.slice(0, separator))
    if (board) return { board, id: value.slice(separator + 1), url: null }
  }

  throw new Error("Use a board-qualified ID such as deliveroo:324827")
}

function sameUrl(left: string, right: string): boolean {
  try {
    const leftUrl = new URL(left)
    const rightUrl = new URL(right)
    return leftUrl.hostname === rightUrl.hostname && leftUrl.pathname === rightUrl.pathname
  } catch {
    return left === right
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex++
      results[index] = await mapper(values[index])
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), values.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
