import type { Board, Source } from "./types.ts"

export const BOARD_CONFIG = {
  greenhouse: [
    { id: "contentful", company: "Contentful", urlId: "contentful" },
    { id: "getyourguide", company: "GetYourGuide", urlId: "getyourguide" },
    { id: "sumup", company: "SumUp", urlId: "sumup" },
    { id: "monzo", company: "Monzo", urlId: "monzo" },
    { id: "wise", company: "Wise", urlId: "wise" },
    {
      id: "trustpilot",
      company: "Trustpilot",
      urlId: "trustpilot",
      urlHosts: ["corporate.trustpilot.com"],
    },
    { id: "wolt", company: "Wolt", urlId: "wolt" },
    { id: "feedzai", company: "Feedzai", urlId: "feedzai", urlHosts: ["careers.feedzai.com"] },
    { id: "celonis", company: "Celonis", urlId: "celonis" },
    { id: "gitlab", company: "GitLab", urlId: "gitlab" },
    { id: "huntress", company: "Huntress", urlId: "huntress" },
    { id: "socket", company: "Socket", urlId: "socket" },
  ],
  ashby: [
    { id: "buffer", company: "Buffer", urlId: "buffer" },
    { id: "testgorilla", company: "TestGorilla", urlId: "testgorilla" },
  ],
  lever: [{ id: "blablacar", company: "BlaBlaCar", urlId: "blablacar" }],
  smartrecruiters: [
    { id: "deliveryhero", company: "Delivery Hero", urlId: "DeliveryHero" },
    { id: "kinsta", company: "Kinsta", urlId: "Kinsta" },
  ],
} satisfies Record<Source, readonly Board[]>

export function boardsFor(source: Source): readonly Board[] {
  return BOARD_CONFIG[source]
}

export function boardFor(source: Source, id: string): Board | null {
  return boardsFor(source).find((board) => board.id === id || board.urlId.toLowerCase() === id.toLowerCase()) ?? null
}

export function boardForUrl(source: Source, input: string): Board | null {
  const hostname = new URL(input).hostname.toLowerCase()
  const compactHost = hostname.replace(/[^a-z0-9]/g, "")

  return (
    boardsFor(source).find((board) => {
      const explicitHost = board.urlHosts?.some((host) => hostname === host || hostname.endsWith(`.${host}`))
      const companyToken = board.company.toLowerCase().replace(/[^a-z0-9]/g, "")
      return explicitHost === true || (companyToken.length > 3 && compactHost.includes(companyToken))
    }) ?? null
  )
}
