import { isObject, textValue } from "../../../../lib/direct-careers/parsing.ts"

const cliPath = new URL("../src/cli.ts", import.meta.url).pathname
const search = await runCli(["search", "-q", "engineer", "--jobage", "30", "--limit", "1", "--format", "json"])
if (search.code !== 0) throw new Error(`company search failed: ${search.stderr.trim()}`)

const result = parseJson(search.stdout)
const results = result.results
if (!Array.isArray(results) || results.length === 0 || !isObject(results[0])) {
  throw new Error("Company live search returned no result")
}

const id = requiredText(results[0], "id")
const title = requiredText(results[0], "title")
const url = requiredText(results[0], "url")
if (!/^https?:\/\//i.test(url)) throw new Error("Company result returned a non-URL posting link")

const detail = await runCli(["detail", id, "--format", "json"])
if (detail.code !== 0) throw new Error(`company detail failed: ${detail.stderr.trim()}`)
const detailRecord = parseJson(detail.stdout)
const description = requiredText(detailRecord, "description")
if (/<\/?[a-z][^>]*>/i.test(description) || description.includes("&amp;")) {
  throw new Error("Company detail description still contains markup or entities")
}

process.stdout.write(`company: ${title} -> detail ${id}\n`)

async function runCli(args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { stdout: "pipe", stderr: "pipe" })
  const code = await child.exited
  const stdout = await new Response(child.stdout).text()
  const stderr = await new Response(child.stderr).text()
  return { code, stdout, stderr }
}

function parseJson(output: string): Record<string, unknown> {
  const value: unknown = JSON.parse(output)
  if (!isObject(value)) throw new Error("Company CLI did not return a JSON object")
  return value
}

function requiredText(record: Record<string, unknown>, field: string): string {
  const value = textValue(record[field])
  if (!value) throw new Error(`Company result has no ${field}`)
  return value
}
