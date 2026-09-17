import { isObject, textValue } from "../parsing.ts"
import type { Source } from "../types.ts"

export async function runLiveSmoke(source: Source, cliPath: string): Promise<void> {
  const searchArguments = searchArgs(source)
  const search = await runCli(cliPath, searchArguments)
  if (search.code !== 0) throw new Error(`${source} search failed: ${search.stderr.trim()}`)

  const result = firstResult(search.stdout)
  const id = requiredText(result, "id")
  const title = requiredText(result, "title")
  const url = requiredText(result, "url")
  if (!/^https?:\/\//i.test(url)) throw new Error(`${source} returned a non-URL posting link`)

  const detail = await runCli(cliPath, ["detail", id, "--format", "json"])
  if (detail.code !== 0) throw new Error(`${source} detail failed: ${detail.stderr.trim()}`)
  const detailRecord = parseJson(detail.stdout)
  const description = requiredText(detailRecord, "description")
  if (/<\/?[a-z][^>]*>/i.test(description) || description.includes("&amp;")) {
    throw new Error(`${source} detail description still contains markup or entities`)
  }

  process.stdout.write(`${source}: ${title} -> detail ${id}\n`)
}

function searchArgs(source: Source): readonly string[] {
  if (source === "greenhouse") return ["search", "-q", "engineer", "--jobage", "30", "--limit", "1", "--format", "json"]
  if (source === "smartrecruiters") return ["search", "-q", "engineer", "--jobage", "30", "--limit", "1", "--format", "json"]
  if (source === "lever") return ["search", "--limit", "1", "--format", "json"]
  return ["search", "--jobage", "30", "--limit", "1", "--format", "json"]
}

async function runCli(cliPath: string, args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { stdout: "pipe", stderr: "pipe" })
  const code = await child.exited
  const stdout = await new Response(child.stdout).text()
  const stderr = await new Response(child.stderr).text()
  return { code, stdout, stderr }
}

function firstResult(output: string): Record<string, unknown> {
  const payload = parseJson(output)
  const results = payload.results
  if (!Array.isArray(results) || results.length === 0 || !isObject(results[0])) {
    throw new Error("Live search returned no result")
  }
  return results[0]
}

function parseJson(output: string): Record<string, unknown> {
  const value: unknown = JSON.parse(output)
  if (!isObject(value)) throw new Error("CLI did not return a JSON object")
  return value
}

function requiredText(record: Record<string, unknown>, field: string): string {
  const value = textValue(record[field])
  if (!value) throw new Error(`CLI result has no ${field}`)
  return value
}
