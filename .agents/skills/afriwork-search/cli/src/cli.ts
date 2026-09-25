import { parseArgs, parseSearchOptions, type ParsedArgs } from "../../../../lib/direct-careers/cli.ts"
import { writeError, writeWarning } from "../../../../lib/direct-careers/http.ts"
import type { OutputFormat } from "../../../../lib/direct-careers/types.ts"
import { detailAfriwork, searchAfriwork, type AfriworkCard, type AfriworkDetail } from "./afriwork.ts"

const SEARCH_FLAGS = ["help", "query", "location", "jobage", "remote", "page", "limit", "format"] as const

export async function runAfriworkCli(argv: readonly string[]): Promise<void> {
  try {
    const args = parseArgs(argv)
    if (hasFlag(args, "help") || args.positionals.length === 0) {
      process.stdout.write(helpText())
      return
    }

    const command = args.positionals[0]
    if (command === "search") {
      assertFlags(args, SEARCH_FLAGS)
      if (args.positionals.length !== 1) throw new Error("search does not accept positional arguments")
      const options = parseSearchOptions(args)
      const result = await searchAfriwork(options)
      if (result.hasMore) {
        writeWarning(
          `Scanned ${result.sourcePages} Afriwork channel pages. More posts remain, so total is limited to scanned pages.`,
          "RESULT_LIMIT",
        )
      }
      process.stdout.write(renderSearch(result.results, result.total, result.sourcePages, result.hasMore, options.page, options.format))
      return
    }

    if (command === "detail") {
      assertFlags(args, ["help", "format"])
      if (args.positionals.length !== 2) throw new Error("detail requires one Afriwork job ID or URL")
      const format = outputFormat(requiredText(args, "format", "json"))
      const detail = await detailAfriwork(args.positionals[1] ?? "")
      process.stdout.write(renderDetail(detail, format))
      return
    }

    throw new Error(`Unknown command: ${command}. Use search or detail`)
  } catch (error) {
    writeError(error instanceof Error ? error.message : String(error), "CLI_ERROR")
    process.exitCode = 1
  }
}

function assertFlags(args: ParsedArgs, allowed: readonly string[]): void {
  const allowedFlags = new Set(allowed)
  const unknown = Object.keys(args.flags).find((flag) => !allowedFlags.has(flag))
  if (unknown) throw new Error(`Unknown flag: --${unknown}`)
}

function hasFlag(args: ParsedArgs, flag: string): boolean {
  return Object.prototype.hasOwnProperty.call(args.flags, flag)
}

function requiredText(args: ParsedArgs, flag: string, defaultValue: string): string {
  const raw = args.flags[flag]
  if (raw === undefined || raw === true) {
    if (raw === true) throw new Error(`--${flag} requires a value`)
    return defaultValue
  }
  const value = raw.trim()
  if (!value) throw new Error(`--${flag} requires a value`)
  return value
}

function outputFormat(value: string): OutputFormat {
  if (value === "json" || value === "table" || value === "plain") return value
  throw new Error("--format must be json, table, or plain")
}

function renderSearch(
  results: readonly AfriworkCard[],
  total: number,
  sourcePages: number,
  hasMore: boolean,
  page: number,
  format: OutputFormat,
): string {
  if (format === "json") {
    return JSON.stringify({ meta: { count: results.length, page, total, sourcePages, hasMore }, results }, null, 2) + "\n"
  }
  if (format === "table") {
    if (results.length === 0) return "No Afriwork jobs found.\n"
    const rows = results.map((job) => [job.title, job.company ?? "-", job.location ?? "-", job.date ?? "-", job.url])
    const headers = ["Title", "Company", "Location", "Date", "URL"]
    const widths = headers.map((header, index) => {
      const width = Math.max(header.length, ...rows.map((row) => oneLine(row[index] ?? "").length))
      return index === 4 ? width : Math.min(48, width)
    })
    const line = (row: readonly string[]): string =>
      row.map((cell, index) => pad(index === 4 ? oneLine(cell) : oneLine(cell).slice(0, widths[index] ?? 0), widths[index] ?? 0)).join(" | ")
    return [line(headers), widths.map((width) => "-".repeat(width)).join("-+-"), ...rows.map(line)].join("\n") + "\n"
  }
  return results
    .map((job) => `${job.title}\n${job.company ?? "-"} | ${job.location ?? "-"} | ${job.date ?? "-"}\n${job.url}`)
    .join("\n\n") + (results.length > 0 ? "\n" : "No Afriwork jobs found.\n")
}

function renderDetail(job: AfriworkDetail, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(job, null, 2) + "\n"
  const header = [
    job.title,
    `Company: ${job.company ?? "-"}`,
    `Location: ${job.location ?? "-"}`,
    `Date: ${job.date ?? "-"}`,
    `Deadline: ${job.deadline ?? "-"}`,
    `Employment: ${job.employmentType ?? "-"}`,
    `Salary: ${job.salary ?? "-"}`,
    `URL: ${job.url}`,
    `Apply in Telegram: ${job.applyUrl ?? "-"}`,
    `Description availability: ${job.descriptionStatus}`,
  ].join("\n")
  return `${header}\n\nDescription\n${job.description ?? "-"}\n`
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length)
}

function helpText(): string {
  return `Usage: bun run .agents/skills/afriwork-search/cli/src/cli.ts <command> [flags]\n\n` +
    "Source: Afriwork public Telegram channel @freelance_ethio\n\n" +
    "Commands:\n" +
    "  search  Search recent public channel posts\n" +
    "  detail  Fetch one post by ID or public channel URL\n\n" +
    "Search flags:\n" +
    "  --query, -q <text>       Search title, company, location, and post text\n" +
    "  --location, -l <text>   Filter by location\n" +
    "  --jobage <days>          Keep recent posts or jobs with an open deadline\n" +
    "  --remote <mode>          remote, hybrid, or onsite, when posted\n" +
    "  --page <n>               1-indexed result page; default 1\n" +
    "  --limit, -n <n>          Results per page; default 25\n" +
    "  --format <format>        json, table, or plain; default json\n\n" +
    "Search is limited to five channel pages per call. Some posts contain excerpts; detail keeps that status visible.\n" +
    "Use IDs such as afriwork:103757.\n"
}

await runAfriworkCli(process.argv.slice(2))
