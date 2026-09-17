import { boardFor, boardForUrl, boardsFor } from "./config.ts"
import { fetchJson, writeWarning } from "./http.ts"
import {
  arrayValue,
  booleanValue,
  htmlToText,
  inferRemote,
  isObject,
  locationText,
  normalizeSearchText,
  objectValue,
  parsedDate,
  textValue,
  type JsonObject,
} from "./parsing.ts"
import type { Board, BoardFailure, JobCard, JobDetail, SearchOptions, Source } from "./types.ts"

export interface SearchResult {
  readonly results: readonly JobCard[]
  readonly total: number
  readonly failures: readonly BoardFailure[]
}

interface JobReference {
  readonly board: Board
  readonly id: string
}

export async function searchJobs(source: Source, options: SearchOptions): Promise<SearchResult> {
  const boards = boardsFor(source)
  const outcomes = await mapWithConcurrency(boards, 4, async (board) => {
    try {
      return { jobs: await fetchBoardJobs(source, board, options.query), failure: null }
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
    .filter((failure): failure is BoardFailure => failure !== null)

  const jobs = uniqueByUrl(
    outcomes.flatMap((outcome) => outcome.jobs).filter((job) => matchesSearch(job, options)),
  ).sort((left, right) => dateScore(right.date) - dateScore(left.date))

  const pageSize = options.limit ?? 25
  const start = (options.page - 1) * pageSize

  return {
    results: jobs.slice(start, start + pageSize).map(toCard),
    total: jobs.length,
    failures,
  }
}

export async function detailJob(source: Source, input: string): Promise<JobDetail> {
  const reference = resolveReference(source, input)

  if (source === "greenhouse") {
    const payload = await fetchJson(
      `https://boards-api.greenhouse.io/v1/boards/${reference.board.id}/jobs/${encodeURIComponent(reference.id)}?content=true`,
    )
    const job = parseGreenhouse(payload, reference.board)
    if (!job) throw new Error("The Greenhouse detail response did not contain a valid job")
    return job
  }

  if (source === "smartrecruiters") {
    const payload = await fetchJson(
      `https://api.smartrecruiters.com/v1/companies/${reference.board.id}/postings/${encodeURIComponent(reference.id)}`,
    )
    const job = parseSmartRecruiters(payload, reference.board)
    if (!job) throw new Error("The SmartRecruiters detail response did not contain a valid job")
    return job
  }

  const payload = await fetchJson(boardEndpoint(source, reference.board, undefined))
  const recordKey = source === "ashby" ? "jobs" : ""
  if (!hasRecordCollection(payload, recordKey)) {
    throw new Error(`The ${source} board returned an invalid posting list`)
  }
  const record = recordsFrom(payload, recordKey)
    .find((candidate) => textValue(candidate.id) === reference.id)
  if (!record) throw new Error(`No ${source} posting ${reference.id} was found on ${reference.board.company}`)

  const job = source === "ashby" ? parseAshby(record, reference.board) : parseLever(record, reference.board)
  if (!job) throw new Error(`The ${source} detail response did not contain a valid job`)
  return job
}

export function parseGreenhouse(payload: unknown, board: Board): JobDetail | null {
  if (!isObject(payload)) return null

  const id = textValue(payload.id)
  const title = textValue(payload.title)
  if (!id || !title) return null

  const description = htmlToText(textValue(payload.content))
  const location = locationText(objectValue(payload, "location"))
  const date = parsedDate(firstPresent(payload.first_published, payload.updated_at, payload.created_at)).text
  const deadline = parsedDate(payload.application_deadline).text
  const url =
    textValue(payload.absolute_url) ?? `https://boards.greenhouse.io/${board.urlId}/jobs/${encodeURIComponent(id)}`

  return {
    id: `${board.id}:${id}`,
    title,
    company: textValue(payload.company_name) ?? board.company,
    location,
    date,
    url,
    source: "greenhouse",
    board: board.id,
    applyUrl: null,
    remote: inferRemote(location, description, null),
    workplaceType: null,
    description,
    deadline,
    employmentType: null,
  }
}

export function parseAshby(payload: unknown, board: Board): JobDetail | null {
  if (!isObject(payload)) return null

  const id = textValue(payload.id)
  const title = textValue(payload.title)
  if (!id || !title) return null

  const description =
    htmlToText(textValue(payload.descriptionHtml)) ?? textValue(payload.descriptionPlain) ?? textValue(payload.description)
  const location = locationText(firstPresent(payload.location, payload.locationName))
  const workplaceType = textValue(payload.workplaceType) ?? textValue(payload.workplaceTypeName)
  const date = parsedDate(firstPresent(payload.publishedAt, payload.updatedAt, payload.createdAt)).text
  const deadline = parsedDate(firstPresent(payload.applicationDeadline, payload.deadline)).text
  const url = textValue(payload.jobUrl) ?? `https://jobs.ashbyhq.com/${board.urlId}/${encodeURIComponent(id)}`

  return {
    id: `${board.id}:${id}`,
    title,
    company: board.company,
    location,
    date,
    url,
    source: "ashby",
    board: board.id,
    applyUrl: textValue(payload.applyUrl),
    remote: inferRemote(location, description, booleanValue(payload.isRemote), workplaceType),
    workplaceType,
    description,
    deadline,
    employmentType: textValue(payload.employmentType),
  }
}

export function parseLever(payload: unknown, board: Board): JobDetail | null {
  if (!isObject(payload)) return null

  const id = textValue(payload.id)
  const title = textValue(payload.text) ?? textValue(payload.title)
  if (!id || !title) return null

  const categories = objectValue(payload, "categories")
  const location = textValue(categories?.location) ?? locationText(categories?.allLocations)
  const workplaceType = textValue(categories?.workplaceType) ?? textValue(payload.workplaceType)
  const description =
    textValue(payload.descriptionPlain) ?? htmlToText(textValue(payload.description)) ?? textValue(payload.description)
  const date = parsedDate(firstPresent(payload.createdAt, payload.updatedAt)).text
  const url = textValue(payload.hostedUrl) ?? `https://jobs.lever.co/${board.urlId}/${encodeURIComponent(id)}`

  return {
    id: `${board.id}:${id}`,
    title,
    company: board.company,
    location,
    date,
    url,
    source: "lever",
    board: board.id,
    applyUrl: textValue(payload.applyUrl),
    remote: inferRemote(location, description, null, workplaceType),
    workplaceType,
    description,
    deadline: null,
    employmentType: textValue(categories?.commitment),
  }
}

export function parseSmartRecruiters(payload: unknown, board: Board): JobDetail | null {
  if (!isObject(payload)) return null

  const id = textValue(payload.id)
  const title = textValue(payload.name) ?? textValue(payload.title)
  if (!id || !title) return null

  const locationObject = objectValue(payload, "location")
  const location = locationText(locationObject) ?? textValue(payload.location)
  const description = smartDescription(payload)
  const hybrid = booleanValue(locationObject?.hybrid)
  const explicitRemote = booleanValue(locationObject?.remote) ?? booleanValue(payload.remote)
  const workplaceType =
    textValue(payload.workplaceType) ??
    textValue(locationObject?.workplaceType) ??
    (hybrid === true ? "hybrid" : explicitRemote === true ? "remote" : explicitRemote === false ? "onsite" : null)
  const date = parsedDate(firstPresent(payload.releasedDate, payload.updatedAt, payload.createdAt)).text
  const deadline = parsedDate(firstPresent(payload.expirationDate, payload.deadline)).text
  const url =
    textValue(payload.postingUrl) ??
    textValue(payload.jobUrl) ??
    `https://jobs.smartrecruiters.com/${board.urlId}/${encodeURIComponent(id)}`

  return {
    id: `${board.id}:${id}`,
    title,
    company: textValue(objectValue(payload, "company")?.name) ?? board.company,
    location,
    date,
    url,
    source: "smartrecruiters",
    board: board.id,
    applyUrl: textValue(payload.applyUrl),
    remote: inferRemote(location, description, explicitRemote, workplaceType),
    workplaceType,
    description,
    deadline,
    employmentType:
      textValue(objectValue(payload, "typeOfEmployment")?.label) ??
      textValue(payload.type) ??
      textValue(payload.employmentType),
  }
}

function smartDescription(payload: JsonObject): string | null {
  const jobAd = objectValue(payload, "jobAd")
  const sections = jobAd?.sections
  const rawSections = Array.isArray(sections)
    ? sections
    : isObject(sections)
      ? Object.values(sections)
      : []

  const text = rawSections
    .filter(isObject)
    .map((section) => {
      const title = textValue(section.title)
      const body = htmlToText(textValue(section.text)) ?? textValue(section.text)
      if (!body) return null
      return title ? `${title}\n${body}` : body
    })
    .filter((section): section is string => section !== null)

  return text.length > 0
    ? text.join("\n\n")
    : htmlToText(textValue(payload.description)) ?? textValue(payload.description)
}

async function fetchBoardJobs(source: Source, board: Board, query: string | undefined): Promise<JobDetail[]> {
  if (source !== "smartrecruiters") {
    const payload = await fetchJson(boardEndpoint(source, board, query))
    if (payload === null) throw new Error(`${board.company} board returned 404`)
    const recordKey = source === "lever" ? "" : "jobs"
    if (!hasRecordCollection(payload, recordKey)) throw new Error(`${board.company} returned an invalid posting list`)
    const records = recordsFrom(payload, recordKey)
    const jobs = records.map((record) => parseRecord(source, record, board)).filter((job): job is JobDetail => job !== null)
    if (records.length > 0 && jobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
    return jobs
  }

  return fetchSmartRecruiters(board, query)
}

async function fetchSmartRecruiters(board: Board, query: string | undefined): Promise<JobDetail[]> {
  const pageSize = 100
  const jobs: JobDetail[] = []
  const seenFirstIds = new Set<string>()
  let offset = 0

  while (true) {
    const url = new URL(`https://api.smartrecruiters.com/v1/companies/${board.id}/postings`)
    url.searchParams.set("limit", String(pageSize))
    url.searchParams.set("offset", String(offset))
    if (query) url.searchParams.set("q", query)

    const payload = await fetchJson(url.toString())
    if (payload === null) throw new Error(`${board.company} board returned 404`)
    if (!hasRecordCollection(payload, "content")) throw new Error(`${board.company} returned an invalid posting page`)
    const records = recordsFrom(payload, "content")
    const firstId = textValue(records[0]?.id)
    if (firstId && seenFirstIds.has(firstId)) throw new Error("SmartRecruiters pagination did not advance")
    if (firstId) seenFirstIds.add(firstId)
    const parsedJobs = records.map((record) => parseSmartRecruiters(record, board)).filter((job): job is JobDetail => job !== null)
    if (records.length > 0 && parsedJobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
    jobs.push(...parsedJobs)

    const total = numberValue(isObject(payload) ? payload.totalFound : null)
    if (records.length === 0 || records.length < pageSize || (total !== null && offset + records.length >= total)) break
    offset += records.length
  }

  return jobs
}

function boardEndpoint(source: Source, board: Board, query: string | undefined): string {
  if (source === "greenhouse") {
    return `https://boards-api.greenhouse.io/v1/boards/${board.id}/jobs?content=true`
  }
  if (source === "ashby") {
    return `https://api.ashbyhq.com/posting-api/job-board/${board.id}`
  }
  if (source === "lever") {
    return `https://api.lever.co/v0/postings/${board.id}?mode=json`
  }

  const url = new URL(`https://api.smartrecruiters.com/v1/companies/${board.id}/postings`)
  url.searchParams.set("limit", "100")
  if (query) url.searchParams.set("q", query)
  return url.toString()
}

function parseRecord(source: Source, record: JsonObject, board: Board): JobDetail | null {
  if (source === "greenhouse") return parseGreenhouse(record, board)
  if (source === "ashby") return parseAshby(record, board)
  if (source === "lever") return parseLever(record, board)
  return parseSmartRecruiters(record, board)
}

function recordsFrom(payload: unknown, key: string): JsonObject[] {
  const values = key ? arrayValue(payload, key) : Array.isArray(payload) ? payload : []
  return values.filter(isObject)
}

function hasRecordCollection(payload: unknown, key: string): boolean {
  return key ? isObject(payload) && Array.isArray(payload[key]) : Array.isArray(payload)
}

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null) ?? null
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function uniqueByUrl(jobs: readonly JobDetail[]): JobDetail[] {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const key = job.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toCard(job: JobDetail): JobCard {
  const { description: _description, deadline: _deadline, employmentType: _employmentType, ...card } = job
  return card
}

function matchesSearch(job: JobDetail, options: SearchOptions): boolean {
  if (options.query) {
    const searchText = normalizeSearchText(
      [job.title, job.company, job.location, job.description, job.workplaceType].filter(
        (value): value is string => value !== null,
      ).join(" "),
    )
    const terms = normalizeSearchText(options.query).split(" ").filter(Boolean)
    if (!terms.every((term) => searchText.includes(term))) return false
  }

  if (options.location) {
    const location = normalizeSearchText(job.location ?? "")
    if (!location.includes(normalizeSearchText(options.location))) return false
  }

  if (options.jobage < 9999) {
    const timestamp = dateScore(job.date)
    const cutoff = Date.now() - options.jobage * 24 * 60 * 60 * 1000
    const deadline = dateScore(job.deadline)
    const deadlineIsOpen = isOpenDeadline(job.deadline, deadline)
    if (deadline !== 0 && !deadlineIsOpen) return false

    const dateIsRecent =
      timestamp === 0 || timestamp >= cutoff || (isDateOnly(job.date) && timestamp + 24 * 60 * 60 * 1000 > cutoff)
    if (!dateIsRecent && !deadlineIsOpen) return false
  }

  if (options.remote === "remote" && job.remote !== true) return false
  if (options.remote === "hybrid" && !normalizeSearchText(job.workplaceType ?? "").includes("hybrid")) return false
  if (options.remote === "onsite" && (job.remote !== false || normalizeSearchText(job.workplaceType ?? "").includes("hybrid"))) {
    return false
  }

  return true
}

function dateScore(date: string | null): number {
  if (!date) return 0
  const timestamp = Date.parse(date)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function isDateOnly(value: string | null): boolean {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isOpenDeadline(value: string | null, timestamp: number): boolean {
  if (timestamp === 0) return false
  const endOfDay = isDateOnly(value) ? timestamp + 24 * 60 * 60 * 1000 - 1 : timestamp
  return endOfDay >= Date.now()
}

function resolveReference(source: Source, input: string): JobReference {
  const value = input.trim()
  if (!value) throw new Error("A job ID or URL is required")

  if (/^https?:\/\//i.test(value)) return referenceFromUrl(source, value)

  const separator = value.includes(":") ? ":" : "/"
  const parts = value.split(separator).filter(Boolean)
  if (parts.length === 2) {
    const board = boardFor(source, parts[0])
    if (board) return { board, id: parts[1] }
  }

  const boards = boardsFor(source)
  if (boards.length === 1) return { board: boards[0], id: value }
  throw new Error(`Use a board-qualified ID such as ${boards[0].id}:${value}`)
}

function referenceFromUrl(source: Source, input: string): JobReference {
  const url = new URL(input)
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent)

  if (source === "greenhouse") {
    const jobsIndex = parts.indexOf("jobs")
    if (jobsIndex > 0 && parts[jobsIndex + 1]) {
      const board = boardFor(source, parts[jobsIndex - 1])
      if (board) return { board, id: parts[jobsIndex + 1] }
    }

    const board = boardForUrl(source, input)
    const queryId = url.searchParams.get("gh_jid")
    const lastPathPart = parts.at(-1)
    if (board && (queryId || lastPathPart)) {
      const id = queryId ?? lastPathPart
      if (id) return { board, id }
    }
  }

  if (source === "ashby") {
    const markerIndex = parts.indexOf("job-board")
    if (markerIndex >= 0 && parts[markerIndex + 2]) {
      const board = boardFor(source, parts[markerIndex + 1])
      if (board) return { board, id: parts[markerIndex + 2] }
    }
    if (parts.length >= 2) {
      const board = boardFor(source, parts[0])
      if (board) return { board, id: parts[1] }
    }
  }

  if (source === "lever") {
    const markerIndex = parts.indexOf("postings")
    if (markerIndex >= 0 && parts[markerIndex + 2]) {
      const board = boardFor(source, parts[markerIndex + 1])
      if (board) return { board, id: parts[markerIndex + 2] }
    }
    for (let index = 0; index < parts.length - 1; index++) {
      const board = boardFor(source, parts[index])
      if (board) return { board, id: parts[index + 1] }
    }
  }

  if (source === "smartrecruiters") {
    const markerIndex = parts.indexOf("companies")
    if (markerIndex >= 0 && parts[markerIndex + 3]) {
      const board = boardFor(source, parts[markerIndex + 1])
      if (board) return { board, id: smartPostingId(parts[markerIndex + 3]) }
    }
    for (let index = 0; index < parts.length - 1; index++) {
      const board = boardFor(source, parts[index])
      if (board) return { board, id: smartPostingId(parts[index + 1]) }
    }
  }

  throw new Error(`Could not identify a ${source} board and job ID from the URL`)
}

function smartPostingId(value: string): string {
  const numericId = value.match(/^\d+/)?.[0]
  return numericId ?? value
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

export function reportFailures(source: Source, failures: readonly BoardFailure[]): void {
  if (failures.length === 0) return
  const details = failures.map((failure) => `${failure.board.id}: ${failure.message}`).join("; ")
  writeWarning(
    `${failures.length} ${source} board${failures.length === 1 ? "" : "s"} failed; returned the remaining results (${details})`,
    "PARTIAL_FAILURE",
  )
}
