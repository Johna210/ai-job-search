import type { JobCard, JobDetail, OutputFormat, RemoteMode, SearchOptions } from "../direct-careers/types.ts"

export type CompanyBoardId = "deliveroo" | "zalando" | "ovhcloud" | "automattic"

export interface CompanyBoard {
  readonly id: CompanyBoardId
  readonly company: string
  readonly endpoint: string
  readonly hosts: readonly string[]
}

export const COMPANY_BOARD_CONFIG = [
  {
    id: "deliveroo",
    company: "Deliveroo",
    endpoint: "https://careers.deliveroo.co.uk",
    hosts: ["careers.deliveroo.co.uk"],
  },
  {
    id: "zalando",
    company: "Zalando",
    endpoint: "https://jobs.zalando.com/en/jobs",
    hosts: ["jobs.zalando.com"],
  },
  {
    id: "ovhcloud",
    company: "OVHcloud",
    endpoint: "https://careers.ovhcloud.com",
    hosts: ["careers.ovhcloud.com"],
  },
  {
    id: "automattic",
    company: "Automattic",
    endpoint: "https://automattic.com/work-with-us/jobs/",
    hosts: ["automattic.com"],
  },
] satisfies readonly CompanyBoard[]

export type CompanyJobCard = Omit<JobCard, "source"> & { readonly source: "company" }
export type CompanyJobDetail = Omit<JobDetail, "source"> & { readonly source: "company" }

export interface CompanyBoardFailure {
  readonly board: CompanyBoard
  readonly message: string
}

export interface CompanySearchResult {
  readonly results: readonly CompanyJobCard[]
  readonly total: number
  readonly failures: readonly CompanyBoardFailure[]
}

export type CompanySearchOptions = SearchOptions
export type CompanyOutputFormat = OutputFormat
export type CompanySearchMode = RemoteMode

export function boardsFor(): readonly CompanyBoard[] {
  return COMPANY_BOARD_CONFIG
}

export function boardFor(id: string): CompanyBoard | null {
  return COMPANY_BOARD_CONFIG.find((board) => board.id === id.toLowerCase()) ?? null
}

export function boardForUrl(input: string): CompanyBoard | null {
  const hostname = new URL(input).hostname.toLowerCase()
  return (
    COMPANY_BOARD_CONFIG.find((board) =>
      board.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
    ) ?? null
  )
}
