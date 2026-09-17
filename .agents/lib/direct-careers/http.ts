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
export async function fetchJson(url: string): Promise<unknown> {
  const maxRetries = 5
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }

    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    const body: unknown = await response.json()
    return body
  }

  throw new Error("Request failed after max retries")
}
