declare const process: {
  readonly argv: readonly string[]
  readonly stderr: { write(chunk: string): boolean }
  readonly stdout: { write(chunk: string): boolean }
  exitCode: number
}

declare module "bun:test" {
  export function test(name: string, callback: () => void | Promise<void>): void
  export function expect(value: unknown): {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toContain(expected: unknown): void
    toBeTruthy(): void
  }
}

interface BunSubprocess {
  readonly exited: Promise<number>
  readonly stdout: ReadableStream<Uint8Array>
  readonly stderr: ReadableStream<Uint8Array>
}

declare const Bun: {
  spawn(command: readonly string[], options: { stdout: "pipe"; stderr: "pipe" }): BunSubprocess
}
