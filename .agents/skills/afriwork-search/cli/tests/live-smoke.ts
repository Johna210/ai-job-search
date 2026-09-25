import { isObject, textValue } from "../../../../lib/direct-careers/parsing.ts"

const cliPath = new URL("../src/cli.ts", import.meta.url).pathname
const search = await runCli(["search", "-q", "developer", "--jobage", "30", "--limit", "5", "--format", "json"])
if (search.code !== 0) throw new Error(`Afriwork search failed: ${search.stderr.trim()}`)

const result = parseJson(search.stdout)
if (!Array.isArray(result.results) || result.results.length === 0 || !isObject(result.results[0])) {
  throw new Error("Afriwork live search returned no job posts")
}

const job = result.results[0]
const id = requiredText(job, "id")
const title = requiredText(job, "title")
const url = requiredText(job, "url")
if (!/^https:\/\/t\.me\/freelance_ethio\/\d+$/.test(url)) {
  throw new Error("Afriwork result returned an invalid public post URL")
}

const detail = await runCli(["detail", id, "--format", "json"])
if (detail.code !== 0) throw new Error(`Afriwork detail failed: ${detail.stderr.trim()}`)
const detailRecord = parseJson(detail.stdout)
const description = textValue(detailRecord.description)
if (!description) throw new Error("Afriwork detail returned no public post description")
if (detailRecord.descriptionStatus !== "as-posted" && detailRecord.descriptionStatus !== "excerpt") {
  throw new Error("Afriwork detail did not report description availability")
}
if (/<\/?[a-z][^>]*>/i.test(description) || description.includes("&amp;")) {
  throw new Error("Afriwork detail description still contains markup or entities")
}

process.stdout.write(`Afriwork: ${title} -> detail ${id} (${detailRecord.descriptionStatus})\n`)

async function runCli(args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { stdout: "pipe", stderr: "pipe" })
  const code = await child.exited
  const stdout = await new Response(child.stdout).text()
  const stderr = await new Response(child.stderr).text()
  return { code, stdout, stderr }
}

function parseJson(output: string): Record<string, unknown> {
  const value: unknown = JSON.parse(output)
  if (!isObject(value)) throw new Error("Afriwork CLI did not return a JSON object")
  return value
}

function requiredText(record: Record<string, unknown>, field: string): string {
  const value = textValue(record[field])
  if (!value) throw new Error(`Afriwork result has no ${field}`)
  return value
}
