import { expect, test } from "bun:test"
import { filteredJobs, parseChannelPage } from "../src/afriwork.ts"
import type { SearchOptions } from "../../../../lib/direct-careers/types.ts"

const channelPage = `
<div class="tgme_widget_message_wrap js-widget_message_wrap">
  <div class="tgme_widget_message" data-post="freelance_ethio/103757">
    <a class="tgme_widget_message_date"><time datetime="2026-09-23T12:45:00+00:00"></time></a>
    <div class="tgme_widget_message_text js-message_text" dir="auto">Job Title: <b>Backend Developer</b><br/><br/>Job Type: <b>On-site - Permanent (Full-time)</b><br/><br/>Work Location: <b>Addis Ababa, Ethiopia</b><br/><br/>Salary/Compensation: <b>25000 ETB Monthly</b><br/><br/>Deadline: <b>October 2nd, 2026</b><br/><br/><b>Description</b>:<br/>Build &amp; ship Go APIs.<br/>Work with PostgreSQL.<br/>__________________<br/><br/><b>Example Tech</b><br/><i>Verified Company ✅</i><br/>12 Jobs Posted<br/>_________________<br/>From: <a href="https://afriworket.com/">afriworket.com</a></div>
    <a href="https://t.me/afriworkapplicantbot/applicantapp?startapp=job-103757">View Details</a>
  </div>
</div>
<a href="/s/freelance_ethio?before=103737">Older posts</a>
`

test("parses a channel job post and preserves its public links", () => {
  const page = parseChannelPage(channelPage)
  const job = page.jobs[0]

  expect(job?.id).toBe("afriwork:103757")
  expect(job?.title).toBe("Backend Developer")
  expect(job?.company).toBe("Example Tech")
  expect(job?.location).toBe("Addis Ababa, Ethiopia")
  expect(job?.date).toBe("2026-09-23T12:45:00.000Z")
  expect(job?.url).toBe("https://t.me/freelance_ethio/103757")
  expect(job?.applyUrl).toBe("https://t.me/afriworkapplicantbot/applicantapp?startapp=job-103757")
  expect(job?.employmentType).toBe("On-site - Permanent (Full-time)")
  expect(job?.workplaceType).toBe("onsite")
  expect(job?.remote).toBe(false)
  expect(job?.deadline).toBe("2026-10-02")
  expect(job?.salary).toBe("25000 ETB Monthly")
  expect(job?.description).toEqual({ kind: "as-posted", text: "Build & ship Go APIs.\nWork with PostgreSQL." })
  expect(page.nextCursor).toBe("103737")
})

test("marks abbreviated post descriptions as excerpts", () => {
  const page = parseChannelPage(`
    <div class="tgme_widget_message_wrap"><div data-post="freelance_ethio/103758">
      <time datetime="2026-09-23T13:00:00Z"></time>
      <div class="tgme_widget_message_text js-message_text">Job Title: QA Engineer<br/>Work Location: Addis Ababa<br/>Description: Review software ... <b>[view details below]</b></div>
    </div></div>
  `)

  expect(page.jobs[0]?.description).toEqual({
    kind: "excerpt",
    text: "Review software ... [view details below]",
  })
})

test("keeps Unicode titles and ignores non-Afriwork application links", () => {
  const page = parseChannelPage(`
    <div class="tgme_widget_message_wrap"><div data-post="freelance_ethio/103759">
      <time datetime="2026-09-23T13:00:00Z"></time>
      <div class="tgme_widget_message_text js-message_text">Job Title: የሶፍትዌር ገንቢ<br/>Work Location: Addis Ababa<br/>Description: Build services.</div>
      <a href="https://example.invalid/apply">Apply</a>
    </div></div>
  `)

  expect(page.jobs[0]?.title).toBe("የሶፍትዌር ገንቢ")
  expect(page.jobs[0]?.applyUrl).toBe(null)
})

test("rejects applicant links with noncanonical origins or credentials", () => {
  for (const applyUrl of [
    "https://t.me:8443/afriworkapplicantbot/applicantapp?startapp=job-1",
    "https://user@t.me/afriworkapplicantbot/applicantapp?startapp=job-1",
  ]) {
    const page = parseChannelPage(`
      <div class="tgme_widget_message_wrap"><div data-post="freelance_ethio/103760">
        <div class="tgme_widget_message_text">Job Title: Backend Engineer<br/>Description: Build APIs.</div>
        <a href="${applyUrl}">View Details</a>
      </div></div>
    `)
    expect(page.jobs[0]?.applyUrl).toBe(null)
  }
})

test("filters by all query terms, location, age, and explicit workplace mode", () => {
  const jobs = parseChannelPage(channelPage).jobs
  const options: SearchOptions = {
    query: "backend developer",
    location: "Addis Ababa",
    jobage: 14,
    remote: "onsite",
    page: 1,
    limit: 25,
    format: "json",
  }

  expect(filteredJobs(jobs, options, Date.parse("2026-09-23T13:00:00Z")).length).toBe(1)
  expect(filteredJobs(jobs, { ...options, remote: "remote" }, Date.parse("2026-09-23T13:00:00Z")).length).toBe(0)
})

test("keeps a job open through its date-only deadline", () => {
  const job = parseChannelPage(channelPage).jobs
  const options: SearchOptions = {
    query: "backend developer",
    location: "Addis Ababa",
    jobage: 14,
    remote: undefined,
    page: 1,
    limit: 25,
    format: "json",
  }

  expect(filteredJobs(job, options, Date.parse("2026-10-02T23:59:59.999Z")).length).toBe(1)
  expect(filteredJobs(job, options, Date.parse("2026-10-03T00:00:00.000Z")).length).toBe(0)
})
