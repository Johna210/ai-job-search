import { expect, test } from "bun:test"
import { parseAutomatticJobs, parseDeliveroo, parseOvhcloudList, parseZalandoDetail, parseZalandoList } from "../../../../lib/company-careers/sources.ts"
import { boardFor } from "../../../../lib/company-careers/types.ts"

test("normalizes a Deliveroo WordPress record", () => {
  const job = parseDeliveroo(
    {
      id: 324827,
      date: "2026-09-14T13:53:14",
      modified: "2026-09-17T00:00:07",
      link: "https://careers.deliveroo.co.uk/role/backend-engineer-example/",
      title: { rendered: "Backend Engineer &#8211; Remote" },
      content: { rendered: "<p>Build APIs &amp; services.</p>" },
      meta: { ats_location: "Remote", ats_remote: true },
    },
    requiredBoard("deliveroo"),
  )

  expect(job?.id).toBe("deliveroo:324827")
  expect(job?.title).toBe("Backend Engineer – Remote")
  expect(job?.description).toBe("Build APIs & services.")
  expect(job?.remote).toBe(true)
})

test("parses a Zalando card and its RSC update timestamp", () => {
  const html = '<a href="/en/jobs/2725358-Backend-Engineer"><article><h2>Backend Engineer</h2><p>Engineering</p><p>Berlin</p></article></a><script>self.__next_f.push([1,"{\\"id\\":\\"2725358\\",\\"updated_at\\":\\"2026-09-17T07:50:22.447-07:00\\"}"])</script>'
  const jobs = parseZalandoList(html, requiredBoard("zalando"))

  expect(jobs.length).toBe(1)
  expect(jobs[0]?.id).toBe("zalando:2725358")
  expect(jobs[0]?.location).toBe("Berlin")
  expect(jobs[0]?.date).toBe("2026-09-17T14:50:22.447Z")
})

test("parses one OVHcloud tile once despite responsive markup", () => {
  const html = '<li class="job-tile job-id-1406926133" data-url="/job/example/1406926133/"><a class="jobTitle-link" href="/job/example/1406926133/">Backend Engineer</a><div id="job-1406926133-desktop-section-customfield1-value">CDI</div><div id="job-1406926133-desktop-section-multilocation-value">Paris, FR</div></li><li class="job-tile job-id-1406926133" data-url="/job/example/1406926133/"><a class="jobTitle-link" href="/job/example/1406926133/">Backend Engineer</a></li>'
  const jobs = parseOvhcloudList(html, requiredBoard("ovhcloud"))

  expect(jobs.length).toBe(1)
  expect(jobs[0]?.id).toBe("ovhcloud:1406926133")
  expect(jobs[0]?.location).toBe("Paris, FR")
  expect(jobs[0]?.employmentType).toBe("CDI")
})

test("parses Automattic embedded job data", () => {
  const html = 'ghJobsData = [{"id":6381135,"title":"Backend Engineer","slug":"backend-engineer","content":"&lt;p&gt;Build services.&lt;/p&gt;","type":"job","href":"https://automattic.com/work-with-us/job/backend-engineer/"}]\n//# sourceURL=jobs.js'
  const jobs = parseAutomatticJobs(html, requiredBoard("automattic"))

  expect(jobs.length).toBe(1)
  expect(jobs[0]?.id).toBe("automattic:6381135")
  expect(jobs[0]?.description).toBe("Build services.")
  expect(jobs[0]?.remote).toBe(true)
  expect(jobs[0]?.employmentType).toBe(null)
})

test("classifies hybrid Zalando roles from their detail text", () => {
  const job = parseZalandoDetail(
    '<link rel="canonical" href="https://jobs.zalando.com/en/jobs/2725358"><h1>Backend Engineer</h1><dl><dt>Location</dt><dd>Berlin</dd></dl><form></form><p>Hybrid working model with regular remote work.</p>',
    requiredBoard("zalando"),
    null,
  )

  expect(job?.remote).toBe(false)
  expect(job?.workplaceType).toBe("hybrid")
})

function requiredBoard(id: string) {
  const board = boardFor(id)
  if (!board) throw new Error(`Missing board ${id}`)
  return board
}
