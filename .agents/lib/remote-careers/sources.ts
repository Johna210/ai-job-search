import { fetchJson, fetchText, writeWarning } from "../direct-careers/http.ts"
import {
  arrayValue,
  htmlToText,
  isObject,
  normalizeSearchText,
  parsedDate,
  textValue,
  type JsonObject,
} from "../direct-careers/parsing.ts"
import type { SearchOptions } from "../direct-careers/types.ts"
import {
  boardFor,
  boardForUrl,
  boardsFor,
  type RemoteBoard,
  type RemoteBoardFailure,
  type RemoteBoardId,
  type RemoteJobCard,
  type RemoteJobDetail,
  type RemoteSearchResult,
} from "./types.ts"

interface JobReference {
  readonly board: RemoteBoard
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

const HIMALAYAS_PAGE_SIZE = 20
const HIMALAYAS_MAX_PAGES = 10
const HIMALAYAS_DETAIL_PAGES = 10

export async function searchJobs(sourceOptions: SearchOptions): Promise<RemoteSearchResult> {
  const requestedPages = Math.max(
    sourceOptions.page,
    Math.ceil((sourceOptions.page * (sourceOptions.limit ?? 25)) / HIMALAYAS_PAGE_SIZE),
  )
  const outcomes = await mapWithConcurrency(boardsFor(), 3, async (board) => {
    try {
      return { jobs: await fetchBoardJobs(board, sourceOptions.query, requestedPages), failure: null }
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
    .filter((failure): failure is RemoteBoardFailure => failure !== null)
  const jobs = uniqueByUrl(
    outcomes.flatMap((outcome) => outcome.jobs).filter((job) => matchesSearch(job, sourceOptions)),
  ).sort((left, right) => dateScore(right.date) - dateScore(left.date))
  const pageSize = sourceOptions.limit ?? 25
  const start = (sourceOptions.page - 1) * pageSize

  return {
    results: jobs.slice(start, start + pageSize).map(toCard),
    total: jobs.length,
    failures,
  }
}

export async function detailJob(input: string): Promise<RemoteJobDetail> {
  const reference = resolveReference(input)
  if (reference.board.id === "himalayas") return detailHimalayas(reference)

  const jobs = await fetchBoardJobs(reference.board, undefined)
  const job = jobs.find((candidate) => {
    if (reference.id !== null) return candidate.id === `${reference.board.id}:${reference.id}`
    return reference.url !== null && sameUrl(candidate.url, reference.url)
  })
  if (!job) {
    const target = reference.id ?? reference.url ?? "the requested posting"
    throw new Error(`No remote posting ${target} was found on ${reference.board.company}`)
  }
  return job
}

export function reportFailures(failures: readonly RemoteBoardFailure[]): void {
  if (failures.length === 0) return
  const details = failures.map((failure) => `${failure.board.id}: ${failure.message}`).join("; ")
  writeWarning(
    `${failures.length} remote board${failures.length === 1 ? "" : "s"} failed; returned the remaining results (${details})`,
    "PARTIAL_FAILURE",
  )
}

async function fetchBoardJobs(board: RemoteBoard, query: string | undefined, page = 1): Promise<RemoteJobDetail[]> {
  switch (board.id) {
    case "himalayas":
      return fetchHimalayas(board, query, page)
    case "weworkremotely":
      return fetchRss(board)
    case "remoteok":
      return fetchRemoteOk(board)
    case "remotive":
      return fetchRss(board)
    case "workingnomads":
      return fetchWorkingNomads(board)
    case "jobicy":
      return fetchJobicy(board)
    default: {
      const exhaustive: never = board.id
      throw new Error(`Unsupported remote board ${exhaustive}`)
    }
  }
}

async function fetchHimalayas(board: RemoteBoard, query: string | undefined, requestedPages: number): Promise<RemoteJobDetail[]> {
  const jobs: RemoteJobDetail[] = []
  let cursor: string | undefined
  const pageCount = Math.min(Math.max(1, requestedPages), HIMALAYAS_MAX_PAGES)

  for (let page = 1; page <= pageCount; page++) {
    const url = new URL(query ? "https://himalayas.app/jobs/api/search" : board.endpoint)
    if (query) {
      url.searchParams.set("q", query)
      if (page > 1) url.searchParams.set("page", String(page))
    } else if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const payload = await fetchJson(url.toString())
    if (payload === null) throw new Error(`${board.company} board returned 404`)
    if (!isObject(payload) || !Array.isArray(payload.jobs)) throw new Error(`${board.company} returned an invalid job list`)

    const records = payload.jobs.filter(isObject)
    const parsedJobs = records.map((record) => parseHimalayas(record, board)).filter((job): job is RemoteJobDetail => job !== null)
    if (records.length > 0 && parsedJobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
    jobs.push(...parsedJobs)

    const nextCursor = textValue(payload.nextCursor)
    if (records.length === 0 || (query ? records.length < HIMALAYAS_PAGE_SIZE : nextCursor === null)) break
    cursor = nextCursor ?? undefined
  }

  return jobs
}

async function detailHimalayas(reference: JobReference): Promise<RemoteJobDetail> {
  const query = detailSearchQuery(reference.url ?? reference.id ?? "")
  const jobs = await fetchHimalayas(reference.board, query, HIMALAYAS_DETAIL_PAGES)
  const job = jobs.find((candidate) => {
    if (reference.id !== null) return candidate.id === `${reference.board.id}:${reference.id}`
    return reference.url !== null && sameUrl(candidate.url, reference.url)
  })
  if (!job) {
    const target = reference.id ?? reference.url ?? "the requested posting"
    throw new Error(`No remote posting ${target} was found on ${reference.board.company}`)
  }
  return job
}

function detailSearchQuery(reference: string): string {
  return lastPathPart(reference)
    .replace(/-\d+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
}

async function fetchRss(board: RemoteBoard): Promise<RemoteJobDetail[]> {
  const payload = await fetchText(board.endpoint)
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  const items = rssItems(payload)
  if (items.length === 0) throw new Error(`${board.company} returned an invalid RSS feed`)
  const jobs = items.map((item) => parseRssItem(item, board)).filter((job): job is RemoteJobDetail => job !== null)
  if (jobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
  return jobs
}

async function fetchRemoteOk(board: RemoteBoard): Promise<RemoteJobDetail[]> {
  const payload = await fetchJson(board.endpoint)
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  if (!Array.isArray(payload)) throw new Error(`${board.company} returned an invalid job list`)

  const records = payload.filter(isObject)
  const jobs = records.map((record) => parseRemoteOk(record, board)).filter((job): job is RemoteJobDetail => job !== null)
  if (records.length > 0 && jobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
  return jobs
}

async function fetchWorkingNomads(board: RemoteBoard): Promise<RemoteJobDetail[]> {
  const payload = await fetchJson(board.endpoint)
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  if (!Array.isArray(payload)) throw new Error(`${board.company} returned an invalid job list`)

  const records = payload.filter(isObject)
  const jobs = records.map((record) => parseWorkingNomads(record, board)).filter((job): job is RemoteJobDetail => job !== null)
  if (records.length > 0 && jobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
  return jobs
}

async function fetchJobicy(board: RemoteBoard): Promise<RemoteJobDetail[]> {
  const url = new URL(board.endpoint)
  url.searchParams.set("count", "50")
  const payload = await fetchJson(url.toString())
  if (payload === null) throw new Error(`${board.company} board returned 404`)
  if (!isObject(payload) || !Array.isArray(payload.jobs)) throw new Error(`${board.company} returned an invalid job list`)

  const records = payload.jobs.filter(isObject)
  const jobs = records.map((record) => parseJobicy(record, board)).filter((job): job is RemoteJobDetail => job !== null)
  if (records.length > 0 && jobs.length === 0) throw new Error(`${board.company} returned invalid posting records`)
  return jobs
}

export function parseHimalayas(record: JsonObject, board: RemoteBoard): RemoteJobDetail | null {
  const title = textValue(record.title)
  const url = textValue(record.applicationLink) ?? textValue(record.guid)
  if (!title || !url) return null

  const companySlug = textValue(record.companySlug)
  const titleSlug = lastPathPart(url)
  const id = companySlug && titleSlug ? `${companySlug}/${titleSlug}` : url
  const restrictions = textList(record.locationRestrictions)
  return buildJob(board, {
    id,
    title,
    company: textValue(record.companyName),
    location: restrictions.length > 0 ? restrictions.join(", ") : "Remote",
    date: parsedDate(record.pubDate).text,
    url,
    applyUrl: url,
    remote: true,
    workplaceType: "remote",
    description: htmlToText(textValue(record.description)) ?? textValue(record.excerpt),
    deadline: parsedDate(record.expiryDate).text,
    employmentType: textValue(record.employmentType),
  })
}

export function parseRssItem(item: string, board: RemoteBoard): RemoteJobDetail | null {
  const rawTitle = rssValue(item, "title")
  const url = rssValue(item, "link") ?? rssValue(item, "guid")
  if (!rawTitle || !url) return null

  if (board.id === "weworkremotely") {
    const creator = rssValue(item, "dc:creator")
    const separator = rawTitle.indexOf(":")
    const company = creator ?? (separator > 0 ? rawTitle.slice(0, separator).trim() : null)
    const title = creator && rawTitle.startsWith(`${creator}:`)
      ? rawTitle.slice(creator.length + 1).trim()
      : separator > 0 && !creator
        ? rawTitle.slice(separator + 1).trim()
        : rawTitle
    const skills = rssValue(item, "skills")
    const description = appendText(htmlToText(rssValue(item, "description")), skills ? `Skills: ${skills}` : null)
    return buildJob(board, {
      id: lastPathPart(url),
      title,
      company,
      location: rssValue(item, "region") ?? rssValue(item, "country") ?? "Remote",
      date: parsedDate(rssValue(item, "pubDate")).text,
      url,
      applyUrl: null,
      remote: true,
      workplaceType: "remote",
      description,
      deadline: parsedDate(rssValue(item, "expires_at")).text,
      employmentType: rssValue(item, "type"),
    })
  }

  const title = rawTitle
  const jobId = rssValue(item, "jobId") ?? lastPathPart(url)
  return buildJob(board, {
    id: jobId,
    title,
    company: rssValue(item, "company"),
    location: rssValue(item, "location") ?? "Remote",
    date: parsedDate(rssValue(item, "pubDate")).text,
    url,
    applyUrl: null,
    remote: true,
    workplaceType: "remote",
    description: appendText(htmlToText(rssValue(item, "description")), rssValue(item, "category")),
    deadline: parsedDate(rssValue(item, "expires_at")).text,
    employmentType: rssValue(item, "type"),
  })
}

export function parseRemoteOk(record: JsonObject, board: RemoteBoard): RemoteJobDetail | null {
  const id = textValue(record.id)
  const title = textValue(record.position)
  const url = textValue(record.url)
  if (!id || !title || !url) return null

  const tags = textList(record.tags)
  return buildJob(board, {
    id,
    title,
    company: textValue(record.company),
    location: textValue(record.location) ?? "Remote",
    date: parsedDate(record.date).text,
    url,
    applyUrl: textValue(record.apply_url),
    remote: true,
    workplaceType: "remote",
    description: appendText(htmlToText(textValue(record.description)), tags.length > 0 ? `Tags: ${tags.join(", ")}` : null),
    deadline: null,
    employmentType: null,
  })
}

export function parseWorkingNomads(record: JsonObject, board: RemoteBoard): RemoteJobDetail | null {
  const url = textValue(record.url)
  const title = textValue(record.title)
  if (!url || !title) return null

  const tags = textValue(record.tags)
  return buildJob(board, {
    id: lastPathPart(url),
    title,
    company: textValue(record.company_name),
    location: textValue(record.location) ?? "Remote",
    date: parsedDate(record.pub_date).text,
    url,
    applyUrl: null,
    remote: true,
    workplaceType: "remote",
    description: appendText(htmlToText(textValue(record.description)), tags ? `Tags: ${tags}` : null),
    deadline: null,
    employmentType: null,
  })
}

export function parseJobicy(record: JsonObject, board: RemoteBoard): RemoteJobDetail | null {
  const id = textValue(record.id)
  const title = textValue(record.jobTitle)
  const url = textValue(record.url)
  if (!id || !title || !url) return null

  const types = textList(record.jobType)
  return buildJob(board, {
    id,
    title,
    company: textValue(record.companyName),
    location: textValue(record.jobGeo) ?? "Remote",
    date: parsedDate(record.pubDate).text,
    url,
    applyUrl: null,
    remote: true,
    workplaceType: "remote",
    description: htmlToText(textValue(record.jobDescription)) ?? textValue(record.jobExcerpt),
    deadline: null,
    employmentType: types.length > 0 ? types.join(", ") : null,
  })
}

function buildJob(board: RemoteBoard, fields: JobFields): RemoteJobDetail {
  return {
    ...fields,
    id: `${board.id}:${fields.id}`,
    source: "remote",
    board: board.id,
  }
}

export function rssItems(xml: string): string[] {
  return Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi), (match) => match[1] ?? "")
}

function rssValue(item: string, tag: string): string | null {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"))
  if (!match) return null
  const value = match[1]?.trim() ?? ""
  const withoutCdata = value.replace(/^<!\[CDATA\[/i, "").replace(/\]\]>$/, "")
  return htmlToText(withoutCdata)
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(textValue).filter((entry): entry is string => entry !== null)
    : []
}

function appendText(value: string | null, suffix: string | null): string | null {
  if (!value) return suffix
  return suffix ? `${value}\n${suffix}` : value
}

function lastPathPart(value: string): string {
  try {
    const path = value.includes("://") ? new URL(value).pathname : value
    const parts = path.split("/").filter(Boolean)
    return parts.at(-1) ?? value
  } catch {
    return value
  }
}

function matchesSearch(job: RemoteJobDetail, options: SearchOptions): boolean {
  if (options.query) {
    const searchText = normalizeSearchText(
      [job.title, job.company, job.location, job.description, job.workplaceType].filter(
        (value): value is string => value !== null,
      ).join(" "),
    )
    const terms = normalizeSearchText(options.query).split(" ").filter(Boolean)
    if (!terms.every((term) => searchText.includes(term))) return false
  }

  if (options.location && !normalizeSearchText(job.location ?? "").includes(normalizeSearchText(options.location))) {
    return false
  }

  if (options.jobage < 9999) {
    const timestamp = dateScore(job.date)
    const cutoff = Date.now() - options.jobage * 24 * 60 * 60 * 1000
    const deadline = dateScore(job.deadline)
    const deadlineIsOpen = isOpenDeadline(job.deadline, deadline)
    if (deadline !== 0 && !deadlineIsOpen) return false
    if (timestamp !== 0 && timestamp < cutoff && !deadlineIsOpen) return false
  }

  if (options.remote === "remote" && job.remote !== true) return false
  if (options.remote === "hybrid") return false
  if (options.remote === "onsite") return false
  return true
}

function dateScore(date: string | null): number {
  if (!date) return 0
  const timestamp = Date.parse(date)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function isOpenDeadline(value: string | null, timestamp: number): boolean {
  if (!value || timestamp === 0) return false
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const endOfDay = dateOnly ? timestamp + 24 * 60 * 60 * 1000 - 1 : timestamp
  return endOfDay >= Date.now()
}

function uniqueByUrl(jobs: readonly RemoteJobDetail[]): RemoteJobDetail[] {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const key = job.url.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toCard(job: RemoteJobDetail): RemoteJobCard {
  const { description: _description, deadline: _deadline, employmentType: _employmentType, ...card } = job
  return card
}

function resolveReference(input: string): JobReference {
  const value = input.trim()
  if (!value) throw new Error("A remote job ID or URL is required")

  if (/^https?:\/\//i.test(value)) {
    const board = boardForUrl(value)
    if (!board) throw new Error("Could not identify a remote board from the URL")
    return { board, id: null, url: value }
  }

  const separator = value.indexOf(":")
  if (separator > 0) {
    const board = boardFor(value.slice(0, separator))
    if (board) return { board, id: value.slice(separator + 1), url: null }
  }

  throw new Error("Use a board-qualified ID such as remoteok:1137399")
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

export function isRemoteBoardId(value: string): value is RemoteBoardId {
  return boardFor(value) !== null
}
