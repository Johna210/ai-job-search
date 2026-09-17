import { expect, test } from "bun:test"
import { isObject } from "../../../../lib/direct-careers/parsing.ts"

test("rejects unknown flags with JSON on stderr", async () => {
  const result = await runCli(["search", "--bogus"])
  expect(result.code).toBe(1)
  const error: unknown = JSON.parse(result.stderr)
  if (!isObject(error)) throw new Error("CLI error was not a JSON object")
  expect(error.code).toBe("CLI_ERROR")
})

test("prints help without making a request", async () => {
  const result = await runCli(["--help"])
  expect(result.code).toBe(0)
  expect(result.stdout).toContain("Deliveroo")
})

test("requires a value for detail format", async () => {
  const result = await runCli(["detail", "deliveroo:324827", "--format="])
  expect(result.code).toBe(1)
  expect(result.stderr).toContain("--format requires a value")
})

async function runCli(args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const cliPath = new URL("../src/cli.ts", import.meta.url).pathname
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { stdout: "pipe", stderr: "pipe" })
  const code = await child.exited
  const stdout = await new Response(child.stdout).text()
  const stderr = await new Response(child.stderr).text()
  return { code, stdout, stderr }
}
