import { expect, test } from "bun:test"
import { isObject } from "../parsing.ts"
import type { Source } from "../types.ts"

export function registerCliContractTests(source: Source, cliPath: string): void {
  test(`${source} rejects unknown flags with JSON on stderr`, async () => {
    const result = await runCli(cliPath, ["search", "--bogus"])
    expect(result.code).toBe(1)
    const error: unknown = JSON.parse(result.stderr)
    if (!isObject(error)) throw new Error("CLI error was not a JSON object")
    expect(error.code).toBe("UNKNOWN_FLAG")
  })

  test(`${source} prints help without making a request`, async () => {
    const result = await runCli(cliPath, ["--help"])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("search")
  })
}

async function runCli(cliPath: string, args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { stdout: "pipe", stderr: "pipe" })
  const code = await child.exited
  const stdout = await new Response(child.stdout).text()
  const stderr = await new Response(child.stderr).text()
  return { code, stdout, stderr }
}
