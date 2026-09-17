import { expect, test } from "bun:test"
import { parseHimalayas, parseJobicy, parseRemoteOk, parseRssItem, parseWorkingNomads, rssItems } from "../../../../lib/remote-careers/sources.ts"
import { boardFor } from "../../../../lib/remote-careers/types.ts"

test("normalizes a Himalayas record and keeps its expiry date", () => {
  const board = requiredBoard("himalayas")
  const job = parseHimalayas(
    {
      title: "Backend Engineer",
      companyName: "Example Labs",
      companySlug: "example-labs",
      locationRestrictions: ["Africa", "Europe"],
      pubDate: 1789657223,
      expiryDate: 1792249223,
      applicationLink: "https://himalayas.app/companies/example-labs/jobs/backend-engineer",
      description: "<p>Build APIs &amp; services.</p>",
      employmentType: "Full Time",
    },
    board,
  )

  expect(job?.id).toBe("himalayas:example-labs/backend-engineer")
  expect(job?.location).toBe("Africa, Europe")
  expect(job?.description).toBe("Build APIs & services.")
  expect(job?.remote).toBe(true)
  expect(job?.deadline).toBe("2026-10-17T15:00:23.000Z")
})

test("parses RSS fields, decodes entities, and keeps deadlines", () => {
  const board = requiredBoard("weworkremotely")
  const xml = "<item><title>Acme: Backend &amp; Engineer</title><region>Anywhere</region><skills>Go, PostgreSQL</skills><description><![CDATA[<p>Build &amp; ship.</p>]]></description><pubDate>Thu, 17 Sep 2026 10:51:23 +0000</pubDate><expires_at>2026-10-01</expires_at><link>https://weworkremotely.com/remote-jobs/acme-backend-engineer</link></item>"
  const item = rssItems(xml)[0]
  const job = item ? parseRssItem(item, board) : null

  expect(job?.id).toBe("weworkremotely:acme-backend-engineer")
  expect(job?.title).toBe("Backend & Engineer")
  expect(job?.company).toBe("Acme")
  expect(job?.description).toBe("Build & ship.\nSkills: Go, PostgreSQL")
  expect(job?.deadline).toBe("2026-10-01")
})

test("skips Remote OK metadata and parses job records", () => {
  const board = requiredBoard("remoteok")
  const job = parseRemoteOk(
    {
      id: 1137399,
      position: "AI agent engineer",
      company: "Sticker Mule",
      date: "2026-09-16T12:44:27+00:00",
      url: "https://remoteOK.com/remote-jobs/remote-ai-agent-engineer-sticker-mule-1137399",
      tags: ["ai", "golang"],
      description: "<p>Build AI agents.</p>",
    },
    board,
  )

  expect(job?.id).toBe("remoteok:1137399")
  expect(job?.description).toBe("Build AI agents.\nTags: ai, golang")
  expect(job?.applyUrl).toBe(null)
})

test("normalizes Working Nomads and Jobicy records", () => {
  const workingNomads = parseWorkingNomads(
    {
      url: "https://www.workingnomads.com/job/go/1867649/",
      title: "Backend Engineer",
      company_name: "Example Labs",
      pub_date: "2026-09-16T12:32:34-04:00",
      location: "Global",
      description: "<p>Build services.</p>",
    },
    requiredBoard("workingnomads"),
  )
  const jobicy = parseJobicy(
    {
      id: 153399,
      url: "https://jobicy.com/jobs/153399-backend-engineer",
      jobTitle: "Backend Engineer",
      companyName: "Example Labs",
      pubDate: "2026-09-16T13:01:14+00:00",
      jobGeo: "Worldwide",
      jobType: ["Full-Time"],
      jobDescription: "<p>Build services.</p>",
    },
    requiredBoard("jobicy"),
  )

  expect(workingNomads?.id).toBe("workingnomads:1867649")
  expect(workingNomads?.description).toBe("Build services.")
  expect(jobicy?.id).toBe("jobicy:153399")
  expect(jobicy?.employmentType).toBe("Full-Time")
})

function requiredBoard(id: string) {
  const board = boardFor(id)
  if (!board) throw new Error(`Missing board ${id}`)
  return board
}
