import { expect, test } from "bun:test"
import { isObject } from "../../../../lib/direct-careers/parsing.ts"

test("rejects unsupported flags with JSON on stderr", async () => {
  const result = await runCli(["search", "--bogus"])
  expect(result.code).toBe(1)
  const error: unknown = JSON.parse(result.stderr)
  if (!isObject(error)) throw new Error("CLI error was not a JSON object")
  expect(error.code).toBe("CLI_ERROR")
})

test("prints help without fetching the channel", async () => {
  const result = await runCli(["--help"])
  expect(result.code).toBe(0)
  expect(result.stdout).toContain("@freelance_ethio")
})

test("requires a job reference for detail", async () => {
  const result = await runCli(["detail"])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain("detail requires one Afriwork job ID or URL")
})

test("rejects result pages that exceed the scan cap without fetching", async () => {
  const result = await runCli(["search", "--page", "5"])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain("The five-page search cap supports at most 100 results")
})

test("rejects detail URLs with extra path segments before fetching", async () => {
  const result = await runCli(["detail", "https://t.me/freelance_ethio/103757/unrelated"])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain("Use an Afriwork ID such as afriwork:103757")
})

test("rejects detail URLs with noncanonical origins before fetching", async () => {
  const result = await runCli(["detail", "https://user@t.me:8443/freelance_ethio/103757"])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain("Unsupported Afriwork URL")
})

async function runCli(args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const cliPath = new URL("../src/cli.ts", import.meta.url).pathname
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { stdout: "pipe", stderr: "pipe" })
  const code = await child.exited
  const stdout = await new Response(child.stdout).text()
  const stderr = await new Response(child.stderr).text()
  return { code, stdout, stderr }
}
