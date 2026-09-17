import { parseArgs, parseSearchOptions, type ParsedArgs } from "../direct-careers/cli.ts"
import { writeError } from "../direct-careers/http.ts"
import type { OutputFormat } from "../direct-careers/types.ts"
import { boardsFor, type CompanyJobCard, type CompanyJobDetail } from "./types.ts"
import { detailJob, reportFailures, searchJobs } from "./sources.ts"

const ALLOWED_FLAGS = ["help", "query", "location", "jobage", "remote", "page", "limit", "format"] as const

export async function runCompanyCli(argv: readonly string[]): Promise<void> {
  try {
    const args = parseArgs(argv)
    if (hasFlag(args, "help") || args.positionals.length === 0) {
      process.stdout.write(helpText())
      return
    }

    const command = args.positionals[0]
    if (command === "search") {
      assertFlags(args)
      if (args.positionals.length > 1) throw new Error("search does not accept positional arguments")
      const options = parseSearchOptions(args)
      const result = await searchJobs(options)
      if (result.failures.length === boardsFor().length) {
        const details = result.failures.map((failure) => `${failure.board.id}: ${failure.message}`).join("; ")
        throw new Error(`Every company board failed (${details})`)
      }
      reportFailures(result.failures)
      process.stdout.write(renderSearch(result.results, result.total, options.page, options.format))
      return
    }

    if (command === "detail") {
      assertFlags(args, ["help", "format"])
      if (args.positionals.length !== 2) throw new Error("detail requires one company job ID or URL")
      const format = outputFormat(requiredOrDefaultText(args, "format", "json"))
      const result = await detailJob(args.positionals[1])
      process.stdout.write(renderDetail(result, format))
      return
    }

    throw new Error(`Unknown command: ${command}. Use search or detail`)
  } catch (error) {
    writeError(error instanceof Error ? error.message : String(error), "CLI_ERROR")
    process.exitCode = 1
  }
}

function assertFlags(args: ParsedArgs, allowed: readonly string[] = ALLOWED_FLAGS): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(args.flags).find((flag) => !allowedSet.has(flag))
  if (unknown) throw new Error(`Unknown flag: --${unknown}`)
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

function requiredOrDefaultText(args: ParsedArgs, flag: string, defaultValue: string): string {
  const value = flagText(args, flag)
  if (hasFlag(args, flag) && value === undefined) throw new Error(`--${flag} requires a value`)
  return value ?? defaultValue
}

function outputFormat(value: string): OutputFormat {
  if (value === "json" || value === "table" || value === "plain") return value
  throw new Error("--format must be json, table, or plain")
}

function renderSearch(results: readonly CompanyJobCard[], total: number, page: number, format: OutputFormat): string {
  if (format === "json") return JSON.stringify({ meta: { count: results.length, page, total }, results }, null, 2) + "\n"
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

function renderDetail(job: CompanyJobDetail, format: OutputFormat): string {
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
  return header + `\n\nDescription\n${job.description ?? "-"}\n`
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length)
}

function helpText(): string {
  const boards = boardsFor().map((board) => board.company).join(", ")
  return `Usage: bun run .agents/skills/company-search/cli/src/cli.ts <command> [flags]\n\n` +
    `Source: company career pages (${boards})\n\n` +
    "Commands:\n" +
    "  search  Search public company career pages\n" +
    "  detail  Fetch one posting by ID or URL\n\n" +
    "Search flags:\n" +
    "  --query, -q <text>       Search title, company, location, and description\n" +
    "  --location, -l <text>   Client-side location filter\n" +
    "  --jobage <days>          Posted within N days; default 9999\n" +
    "  --remote <mode>          remote, hybrid, or onsite\n" +
    "  --page <n>               1-indexed page; default 1\n" +
    "  --limit, -n <n>          Results per page; default 25\n" +
    "  --format <format>        json, table, or plain; default json\n\n" +
    "Detail IDs are board-qualified, for example:\n" +
    `  ${boardsFor()[0].id}:posting-id\n`
}
