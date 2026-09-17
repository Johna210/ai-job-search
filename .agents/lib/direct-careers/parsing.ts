export type JsonObject = Record<string, unknown>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function objectValue(value: unknown, key: string): JsonObject | null {
  if (!isObject(value)) return null
  const child = value[key]
  return isObject(child) ? child : null
}

export function arrayValue(value: unknown, key: string): unknown[] {
  if (!isObject(value)) return []
  const child = value[key]
  return Array.isArray(child) ? child : []
}

export function textValue(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim()
    return text.length > 0 ? text : null
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

export function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

export interface ParsedDate {
  readonly text: string | null
  readonly timestamp: number | null
}

export function parsedDate(value: unknown): ParsedDate {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = value < 100000000000 ? value * 1000 : value
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime())
      ? { text: String(value), timestamp: null }
      : { text: date.toISOString(), timestamp }
  }

  const text = textValue(value)
  if (!text) return { text: null, timestamp: null }
  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) return { text, timestamp: null }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return { text, timestamp: null }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? { text, timestamp } : { text: date.toISOString(), timestamp }
}

export function htmlToText(value: string | null): string | null {
  if (!value) return null

  const decoded = decodeEntities(value)

  const withBreaks = decoded
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|ul|ol|h[1-6]|section|article|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")

  const lines = withBreaks
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)

  return lines.length > 0 ? lines.join("\n") : null
}

function decodeEntities(value: string): string {
  let decoded = value
  for (let pass = 0; pass < 3; pass++) {
    const next = decoded
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&#(\d+);/g, (_match, decimal: string) => numericEntity(Number.parseInt(decimal, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, hexadecimal: string) =>
        numericEntity(Number.parseInt(hexadecimal, 16)),
      )
    if (next === decoded) return decoded
    decoded = next
  }
  return decoded
}

function numericEntity(codePoint: number): string {
  return codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ""
}

export function locationText(value: unknown): string | null {
  const direct = textValue(value)
  if (direct) return cleanLocation(direct)

  if (Array.isArray(value)) {
    const locations = value.map(locationText).filter((location): location is string => location !== null)
    return locations.length > 0 ? locations.join("; ") : null
  }

  if (!isObject(value)) return null
  for (const key of ["name", "fullLocation"]) {
    const text = textValue(value[key])
    if (text) return cleanLocation(text)
  }

  const structured = [value.city, value.region, value.state, value.country]
    .map(textValue)
    .filter((part): part is string => part !== null)
  if (structured.length > 0) return cleanLocation(structured.join(", "))

  for (const key of ["city", "address", "country"]) {
    const text = textValue(value[key])
    if (text) return cleanLocation(text)
  }

  return null
}

export function inferRemote(
  location: string | null,
  description: string | null,
  explicit: boolean | null,
  workplaceType: string | null = null,
): boolean | null {
  if (explicit !== null) return explicit
  const workplace = (workplaceType ?? "").toLowerCase()
  if (/hybrid|onsite|on-site/.test(workplace)) return false
  if (/remote|work from home|distributed|anywhere/.test(workplace)) return true

  const mode = `${location ?? ""}`.toLowerCase()
  if (/remote|work from home|distributed|anywhere/.test(mode)) return true
  if (description && /fully remote|100% remote|remote-first|work from anywhere/.test(description.toLowerCase())) {
    return true
  }
  return null
}

function cleanLocation(value: string): string {
  return value.replace(/\s*,\s*,/g, ",").replace(/,\s*$/, "").replace(/\s+/g, " ").trim()
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
