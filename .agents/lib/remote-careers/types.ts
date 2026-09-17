import type { JobCard, JobDetail, OutputFormat, RemoteMode, SearchOptions } from "../direct-careers/types.ts"

export type RemoteBoardId =
  | "himalayas"
  | "weworkremotely"
  | "remoteok"
  | "remotive"
  | "workingnomads"
  | "jobicy"

export interface RemoteBoard {
  readonly id: RemoteBoardId
  readonly company: string
  readonly endpoint: string
  readonly hosts: readonly string[]
}

export const REMOTE_BOARD_CONFIG = [
  {
    id: "himalayas",
    company: "Himalayas",
    endpoint: "https://himalayas.app/jobs/api",
    hosts: ["himalayas.app"],
  },
  {
    id: "weworkremotely",
    company: "We Work Remotely",
    endpoint: "https://weworkremotely.com/remote-jobs.rss",
    hosts: ["weworkremotely.com"],
  },
  {
    id: "remoteok",
    company: "Remote OK",
    endpoint: "https://remoteok.com/api",
    hosts: ["remoteok.com"],
  },
  {
    id: "remotive",
    company: "Remotive",
    endpoint: "https://remotive.com/remote-jobs/feed",
    hosts: ["remotive.com"],
  },
  {
    id: "workingnomads",
    company: "Working Nomads",
    endpoint: "https://www.workingnomads.com/api/exposed_jobs/",
    hosts: ["workingnomads.com", "www.workingnomads.com"],
  },
  {
    id: "jobicy",
    company: "Jobicy",
    endpoint: "https://jobicy.com/api/v2/remote-jobs",
    hosts: ["jobicy.com"],
  },
] satisfies readonly RemoteBoard[]

export type RemoteJobCard = Omit<JobCard, "source"> & { readonly source: "remote" }
export type RemoteJobDetail = Omit<JobDetail, "source"> & { readonly source: "remote" }

export interface RemoteSearchResult {
  readonly results: readonly RemoteJobCard[]
  readonly total: number
  readonly failures: readonly RemoteBoardFailure[]
}

export interface RemoteBoardFailure {
  readonly board: RemoteBoard
  readonly message: string
}

export type RemoteSearchOptions = SearchOptions
export type RemoteOutputFormat = OutputFormat
export type RemoteSearchMode = RemoteMode

export function boardsFor(): readonly RemoteBoard[] {
  return REMOTE_BOARD_CONFIG
}

export function boardFor(id: string): RemoteBoard | null {
  return REMOTE_BOARD_CONFIG.find((board) => board.id === id.toLowerCase()) ?? null
}

export function boardForUrl(input: string): RemoteBoard | null {
  const hostname = new URL(input).hostname.toLowerCase()
  return (
    REMOTE_BOARD_CONFIG.find((board) =>
      board.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
    ) ?? null
  )
}
