import { boardsFor } from "./config.ts"
import { writeError } from "./http.ts"
import { detailJob, reportFailures, searchJobs } from "./sources.ts"
import type { JobCard, JobDetail, OutputFormat, RemoteMode, SearchOptions, Source } from "./types.ts"

export interface ParsedArgs {
  readonly positionals: readonly string[]
  readonly flags: Readonly<Record<string, string | true>>
}

class CliError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
  }
}

export async function runSourceCli(source: Source, argv: readonly string[]): Promise<void> {
  try {
    const args = parseArgs(argv)
    if (hasFlag(args, "help") || args.positionals.length === 0) {
      process.stdout.write(helpText(source))
      return
    }

    const command = args.positionals[0]
    if (command === "search") {
      assertFlags(args, ["help", "query", "location", "jobage", "remote", "page", "limit", "format"])
      if (args.positionals.length > 1) throw new CliError("search does not accept positional arguments", "INVALID_ARGUMENT")

      const options = parseSearchOptions(args)
      const result = await searchJobs(source, options)
      if (result.failures.length === boardsFor(source).length) {
        const details = result.failures.map((failure) => `${failure.board.id}: ${failure.message}`).join("; ")
        throw new CliError(`Every configured ${source} board failed (${details})`, "ALL_BOARDS_FAILED")
      }
      reportFailures(source, result.failures)
      process.stdout.write(renderSearch(result.results, result.total, options.page, options.format))
      return
    }

    if (command === "detail") {
      assertFlags(args, ["help", "format"])
      if (args.positionals.length !== 2) {
        throw new CliError("detail requires one job ID or URL", "MISSING_JOB_REFERENCE")
      }
      const format = outputFormat(requiredOrDefaultText(args, "format", "json"))
      const result = await detailJob(source, args.positionals[1])
      process.stdout.write(renderDetail(result, format))
      return
    }

    throw new CliError(`Unknown command: ${command}. Use search or detail`, "UNKNOWN_COMMAND")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = error instanceof CliError ? error.code : "CLI_ERROR"
    writeError(message, code)
    process.exitCode = 1
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Record<string, string | true> = {}
  const aliases: Record<string, string> = { q: "query", l: "location", n: "limit" }

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (!argument.startsWith("-")) {
      positionals.push(argument)
      continue
    }

    const long = argument.startsWith("--")
    const raw = argument.slice(long ? 2 : 1)
    if (!raw) throw new CliError("Empty flag is not valid", "INVALID_ARGUMENT")

    const equalsIndex = raw.indexOf("=")
    const rawName = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw
    const name = long ? rawName : aliases[rawName] ?? rawName
    let value: string | true = equalsIndex >= 0 ? raw.slice(equalsIndex + 1) : true

    if (value === true && index + 1 < argv.length && !argv[index + 1].startsWith("-")) {
      value = argv[index + 1]
      index++
    }
    flags[name] = value
  }

  return { positionals, flags }
}

function assertFlags(args: ParsedArgs, allowed: readonly string[]): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(args.flags).find((flag) => !allowedSet.has(flag))
  if (unknown) throw new CliError(`Unknown flag: --${unknown}`, "UNKNOWN_FLAG")
}

function hasFlag(args: ParsedArgs, flag: string): boolean {
  return Object.prototype.hasOwnProperty.call(args.flags, flag)
}

function flagText(args: ParsedArgs, flag: string): string | undefined {
  const value = args.flags[flag]
  if (value === undefined || value === true) return undefined
  const text = value.trim()
  return text.length > 0 ? text : undefined
}

export function parseSearchOptions(args: ParsedArgs): SearchOptions {
  return {
    query: optionalText(args, "query"),
    location: optionalText(args, "location"),
    jobage: integerFlag(args, "jobage", 9999, 0),
    remote: remoteFlag(args),
    page: integerFlag(args, "page", 1, 1),
    limit: integerFlag(args, "limit", 25, 1),
    format: outputFormat(requiredOrDefaultText(args, "format", "json")),
  }
}

function integerFlag(args: ParsedArgs, flag: string, defaultValue: number, minimum: number): number {
  const raw = flagText(args, flag)
  if (raw === undefined) {
    if (hasFlag(args, flag)) throw new CliError(`--${flag} requires a value`, "INVALID_ARGUMENT")
    return defaultValue
  }

  const value = Number(raw)
  if (!Number.isInteger(value) || value < minimum) {
    throw new CliError(`--${flag} must be an integer >= ${minimum}`, "INVALID_ARGUMENT")
  }
  return value
}

function remoteFlag(args: ParsedArgs): RemoteMode | undefined {
  const value = flagText(args, "remote")
  if (value === undefined) {
    if (hasFlag(args, "remote")) throw new CliError("--remote requires remote, hybrid, or onsite", "INVALID_ARGUMENT")
    return undefined
  }
  if (value !== "remote" && value !== "hybrid" && value !== "onsite") {
    throw new CliError("--remote must be remote, hybrid, or onsite", "INVALID_ARGUMENT")
  }
  return value
}

function optionalText(args: ParsedArgs, flag: string): string | undefined {
  const value = flagText(args, flag)
  if (hasFlag(args, flag) && value === undefined) {
    throw new CliError(`--${flag} requires a value`, "INVALID_ARGUMENT")
  }
  return value
}

function requiredOrDefaultText(args: ParsedArgs, flag: string, defaultValue: string): string {
  return optionalText(args, flag) ?? defaultValue
}

function outputFormat(value: string): OutputFormat {
  if (value === "json" || value === "table" || value === "plain") return value
  throw new CliError("--format must be json, table, or plain", "INVALID_ARGUMENT")
}

function renderSearch(results: readonly JobCard[], total: number, page: number, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify({ meta: { count: results.length, page, total }, results }, null, 2) + "\n"
  }

  if (format === "table") {
    if (results.length === 0) return "No jobs found.\n"
    const rows = results.map((job) => [job.title, job.company ?? "-", job.location ?? "-", job.date ?? "-", job.url])
    const headers = ["Title", "Company", "Location", "Date", "URL"]
    const widths = headers.map((header, index) => {
      const width = Math.max(header.length, ...rows.map((row) => oneLine(row[index]).length))
      return index === 4 ? width : Math.min(48, width)
    })
    const line = (row: readonly string[]): string =>
      row.map((cell, index) => pad(index === 4 ? oneLine(cell) : oneLine(cell).slice(0, widths[index]), widths[index])).join(" | ")
    return [line(headers), widths.map((width) => "-".repeat(width)).join("-+-"), ...rows.map(line)].join("\n") + "\n"
  }

  return results
    .map((job) => `${job.title}\n${job.company ?? "-"} | ${job.location ?? "-"} | ${job.date ?? "-"}\n${job.url}`)
    .join("\n\n") + (results.length > 0 ? "\n" : "No jobs found.\n")
}

function renderDetail(job: JobDetail, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(job, null, 2) + "\n"

  const header = [
    job.title,
    `Company: ${job.company ?? "-"}`,
    `Location: ${job.location ?? "-"}`,
    `Date: ${job.date ?? "-"}`,
    `Deadline: ${job.deadline ?? "-"}`,
    `Employment: ${job.employmentType ?? "-"}`,
    `URL: ${job.url}`,
    `Apply: ${job.applyUrl ?? "-"}`,
  ].join("\n")
  const description = job.description ? `\n\nDescription\n${job.description}` : "\n\nDescription\n-"
  return header + description + "\n"
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length)
}

function helpText(source: Source): string {
  const boards = boardsFor(source).map((board) => board.company).join(", ")
  return `Usage: bun run .agents/skills/${source}-search/cli/src/cli.ts <command> [flags]\n\n` +
    `Source: ${source} (${boards})\n\n` +
    "Commands:\n" +
    "  search  Search public job-board postings\n" +
    "  detail  Fetch one posting by ID or URL\n\n" +
    "Search flags:\n" +
    "  --query, -q <text>       Search title, company, location, and description\n" +
    "  --location, -l <text>   Client-side location filter\n" +
    "  --jobage <days>          Posted within N days; default 9999\n" +
    "  --remote <mode>          remote, hybrid, or onsite\n" +
    "  --page <n>               1-indexed page; default 1\n" +
    "  --limit, -n <n>          Results per page; default 25\n" +
    "  --format <format>        json, table, or plain; default json\n\n" +
    "Detail IDs are board-qualified when a source has multiple boards, for example:\n" +
    `  ${boardsFor(source)[0].id}:12345\n`
}
