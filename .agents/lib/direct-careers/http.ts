const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export function writeWarning(message: string, code: string): void {
  process.stderr.write(JSON.stringify({ warning: message, code }) + "\n")
}

/** Fetch public JSON with bounded retries for temporary server responses. */
export async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  return fetchPublic(url, "application/json", timeoutMs, (response) => response.json())
}

/** Fetch public text with the same bounded retry policy as JSON requests. */
export async function fetchText(url: string, timeoutMs = 15000): Promise<string | null> {
  return fetchPublic(url, "text/plain, text/html, application/rss+xml, application/xml", timeoutMs, (response) => response.text())
}

async function fetchPublic<T>(
  url: string,
  accept: string,
  timeoutMs: number,
  read: (response: Response) => Promise<T>,
): Promise<T | null> {
  const maxRetries = 5
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          Accept: accept,
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      if (attempt === maxRetries || !isTimeoutError(error)) throw error
      await waitBeforeRetry(delay)
      delay = Math.min(delay * 2, 8000)
      continue
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      await waitBeforeRetry(delay)
      delay = Math.min(delay * 2, 8000)
      continue
    }

    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    try {
      return await read(response)
    } catch (error) {
      if (attempt === maxRetries || !isTimeoutError(error)) throw error
      await waitBeforeRetry(delay)
      delay = Math.min(delay * 2, 8000)
    }
  }

  throw new Error("Request failed after max retries")
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && /abort|timed out|timeout/i.test(error.message)
}

async function waitBeforeRetry(delay: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 500)
  await new Promise((resolve) => setTimeout(resolve, delay + jitter))
}
