export type Source = "greenhouse" | "ashby" | "lever" | "smartrecruiters"

export type OutputFormat = "json" | "table" | "plain"

export type RemoteMode = "remote" | "hybrid" | "onsite"

export interface Board {
  readonly id: string
  readonly company: string
  readonly urlId: string
  readonly urlHosts?: readonly string[]
}

export interface SearchOptions {
  readonly query: string | undefined
  readonly jobage: number
  readonly location: string | undefined
  readonly remote: RemoteMode | undefined
  readonly page: number
  readonly limit: number | undefined
  readonly format: OutputFormat
}

export interface JobCard {
  readonly id: string
  readonly title: string
  readonly company: string | null
  readonly location: string | null
  readonly date: string | null
  readonly url: string
  readonly source: Source
  readonly board: string
  readonly applyUrl: string | null
  readonly remote: boolean | null
  readonly workplaceType: string | null
}

export interface JobDetail extends JobCard {
  readonly description: string | null
  readonly deadline: string | null
  readonly employmentType: string | null
}

export interface BoardFailure {
  readonly board: Board
  readonly message: string
}
