import { expect, test } from "bun:test"
import { boardFor } from "../config.ts"
import { parseArgs, parseSearchOptions } from "../cli.ts"
import { htmlToText, locationText } from "../parsing.ts"
import { parseAshby, parseGreenhouse, parseLever, parseSmartRecruiters } from "../sources.ts"

test("decodes posting HTML without leaving tags or entities", () => {
  expect(htmlToText("<p>Build &amp; ship</p><ul><li>APIs</li></ul>")).toBe("Build & ship\nAPIs")
  expect(htmlToText("&lt;p&gt;Encoded body&lt;/p&gt;")).toBe("Encoded body")
})

test("normalizes Greenhouse jobs into the shared contract", () => {
  const job = parseGreenhouse(
    {
      id: 123,
      title: "Backend Engineer",
      company_name: "Contentful",
      location: { name: "Remote" },
      first_published: "2026-09-17T12:00:00Z",
      application_deadline: "2026-10-01",
      absolute_url: "https://job-boards.greenhouse.io/contentful/jobs/123",
      content: "<p>Build services with <strong>TypeScript</strong>.</p>",
    },
    { id: "contentful", company: "Contentful", urlId: "contentful" },
  )

  expect(job?.id).toBe("contentful:123")
  expect(job?.description).toBe("Build services with TypeScript.")
  expect(job?.remote).toBe(true)
  expect(job?.deadline).toBe("2026-10-01")
})

test("normalizes Ashby descriptions from the board response", () => {
  const job = parseAshby(
    {
      id: "ashby-id",
      title: "Platform Engineer",
      location: "Remote",
      isRemote: true,
      publishedAt: "2026-09-17T12:00:00Z",
      jobUrl: "https://jobs.ashbyhq.com/buffer/ashby-id",
      descriptionHtml: "<p>Own the platform.</p>",
    },
    { id: "buffer", company: "Buffer", urlId: "buffer" },
  )

  expect(job?.id).toBe("buffer:ashby-id")
  expect(job?.description).toBe("Own the platform.")
  expect(job?.remote).toBe(true)
})

test("normalizes Lever timestamps and apply links", () => {
  const job = parseLever(
    {
      id: "lever-id",
      text: "Backend Engineer",
      categories: { location: "Paris", commitment: "Permanent", workplaceType: "remote" },
      createdAt: 1789646400000,
      hostedUrl: "https://jobs.lever.co/blablacar/lever-id",
      applyUrl: "https://jobs.lever.co/blablacar/lever-id/apply",
      descriptionPlain: "Build payment services.",
    },
    { id: "blablacar", company: "BlaBlaCar", urlId: "blablacar" },
  )

  expect(job?.id).toBe("blablacar:lever-id")
  expect(job?.applyUrl).toContain("/apply")
  expect(job?.remote).toBe(true)
})

test("normalizes SmartRecruiters locations and detail sections", () => {
  const job = parseSmartRecruiters(
    {
      id: "smart-id",
      name: "Software Engineer",
      location: { city: "Montevideo", region: "", country: "Uruguay", remote: false, hybrid: true },
      releasedDate: "2026-09-17T12:00:00Z",
      postingUrl: "https://jobs.smartrecruiters.com/DeliveryHero/smart-id",
      typeOfEmployment: { label: "Full-time" },
      jobAd: { sections: { intro: { title: "About", text: "<p>Join us.</p>" } } },
    },
    { id: "deliveryhero", company: "Delivery Hero", urlId: "DeliveryHero" },
  )

  expect(job?.id).toBe("deliveryhero:smart-id")
  expect(job?.location).toBe("Montevideo, Uruguay")
  expect(job?.description).toBe("About\nJoin us.")
  expect(job?.workplaceType).toBe("hybrid")
  expect(job?.employmentType).toBe("Full-time")
})

test("formats array locations without empty comma segments", () => {
  expect(locationText({ name: "Buenos Aires, , Argentina" })).toBe("Buenos Aires, Argentina")
  expect(boardFor("smartrecruiters", "deliveryhero")?.urlId).toBe("DeliveryHero")
})

test("rejects missing option values before making a request", () => {
  let message = ""
  try {
    parseSearchOptions(parseArgs(["search", "--query"]))
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  expect(message).toContain("--query requires a value")
})
