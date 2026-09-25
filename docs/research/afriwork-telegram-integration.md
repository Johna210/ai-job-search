# Afriwork Telegram integration

Research date: 2026-09-22

## Conclusion

The strongest public integration route is Afriwork's Telegram channel, `@freelance_ethio`, not the private conversation with `@afriworkapplicantbot`. Afriwork's own site links to that channel, and the public channel contains job posts with fields such as title, type, location, salary, deadline, and a details link. The details link opens the applicant bot's Mini App. ([Afriwork home](https://afriworket.com/), [Afriwork Find Work](https://afriworket.com/find-work), [channel page](https://t.me/freelance_ethio), [public channel preview](https://t.me/s/freelance_ethio))

I found no public Afriwork documentation for a jobs API, RSS feed, or export. That is a finding about the public pages reviewed, not proof that Afriwork has no private or partner API. The Telegram channel is a public feed in the ordinary sense, but it is not a documented developer API. ([Afriwork jobs](https://afriworket.com/jobs), [Afriwork FAQ](https://afriworket.com/faq), [Afriwork sitemap](https://afriworket.com/sitemap.xml), [Afriwork Help Center](https://afriwork.tawk.help/), [public channel preview](https://t.me/s/freelance_ethio))

At the time of the initial research, a repo integration looked possible through the public channel, subject to confirming terms, stable parsing, and enough post detail for the repo's `search` and `detail` contract. A user could also forward or paste a job post into a separate intake path. Neither integration existed then. The current CLI is documented in the follow-up section below. ([portal-cli-addition skill](../../.agents/skills/portal-cli-addition/SKILL.md#L18-L29), [portal CLI contract](../../.agents/skills/portal-cli-addition/SKILL.md#L82-L113), [scrape skill](../../.agents/skills/scrape/SKILL.md#L58-L72), [repo README](../../README.md#L102-L114))

## What the bot publicly appears to do

Telegram's public page identifies the bot as **Afriwork Applicant Bot**, `@afriworkapplicantbot`. The page shows a launch action and a monthly-user count, but no public description of its commands or behavior. ([Telegram bot page](https://t.me/afriworkapplicantbot))

Afriwork's public channel description labels `@afriworkapplicantbot` as its job-seeker bot. Afriwork's Find Work page promotes the channel and says job seekers can explore listings and apply through its platform. Public channel posts show job summaries and link to `https://t.me/afriworkapplicantbot/applicantapp?startapp=...` for details. This supports the limited conclusion that the bot or its Mini App helps job seekers view Afriwork opportunities. I did not start the bot or test its actual conversation flow. ([Afriwork Find Work](https://afriworket.com/find-work), [Telegram channel page](https://t.me/freelance_ethio), [channel post example](https://t.me/freelance_ethio/103693), [applicant Mini App link](https://t.me/afriworkapplicantbot/applicantapp))

## Official API, feed, and export evidence

Afriwork's homepage and Find Work page link directly to `@freelance_ethio`; the public Telegram preview contains job posts. This makes the channel the one confirmed public feed found in this review. ([Afriwork home](https://afriworket.com/), [Afriwork Find Work](https://afriworket.com/find-work), [public channel preview](https://t.me/s/freelance_ethio))

Afriwork also publishes a `/jobs` page. The read-only page fetch showed a "Discover Jobs" heading and job filters, but no job records in the returned page text. The page may depend on client-side rendering; this observation does not show that listings require login or that no underlying endpoint exists. I did not inspect undocumented backend endpoints. ([Afriwork jobs](https://afriworket.com/jobs))

I found no API reference, feed specification, or export instructions on the public home, jobs, Find Work, FAQ, sitemap, or Help Center pages reviewed. Afriwork may offer an undocumented, private, or partner API. Confirm that with Afriwork before treating the absence of public documentation as a definitive no. ([Afriwork home](https://afriworket.com/), [Afriwork jobs](https://afriworket.com/jobs), [Afriwork Find Work](https://afriworket.com/find-work), [Afriwork FAQ](https://afriworket.com/faq), [Afriwork sitemap](https://afriworket.com/sitemap.xml), [Afriwork Help Center](https://afriwork.tawk.help/))

## Telegram limits and options

### Another bot's private conversation

The Telegram Bot FAQ says a bot receives messages from its own private chats with users and messages from channels where it is a member. It also says bots do not see messages from other bots. The Bot API exposes new incoming updates, including `message` and `channel_post`; it does not document a general method for reading another bot's user-chat history. ([Bot FAQ: messages a bot receives](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get), [Bot FAQ: messages from other bots](https://core.telegram.org/bots/faq#why-doesn-39t-my-bot-see-messages-from-other-bots), [Bot API Update](https://core.telegram.org/bots/api#update))

There is a newer, specific exception. Telegram's Bot Features page says bots can send private messages to other bots when both have Bot-to-Bot Communication Mode enabled. The Bot API 10.0 changelog dates support for sending messages to bots by username to May 8, 2026. The FAQ still carries its broader no-bot-messages statement, so Telegram's official pages are not fully aligned. Treat private bot-to-bot messaging as an explicit opt-in feature, not as permission to inspect `@afriworkapplicantbot`'s existing conversations with users. Whether Afriwork has enabled the feature is unknown. ([Bot-to-Bot Communication](https://core.telegram.org/bots/features#bot-to-bot-communication), [Bot API changelog, May 8, 2026](https://core.telegram.org/bots/api-changelog#may-8-2026), [Bot FAQ](https://core.telegram.org/bots/faq#why-doesn-39t-my-bot-see-messages-from-other-bots))

The API method `getUserPersonalChatMessages` does not document a way to read arbitrary bot conversations. Its stated scope is the last messages from a user's personal chat currently added to that user's profile. ([getUserPersonalChatMessages](https://core.telegram.org/bots/api#getuserpersonalchatmessages))

### Forwarding a job post

A user can mediate by forwarding an allowed job message to a separate intake bot. Telegram says bots receive messages sent to their private chats with users, and the Bot API's `Message` object includes `forward_origin` for forwarded messages. Messages marked as protected content cannot be forwarded. This would require a new intake path; the repo's current portal contract is a CLI with `search` and `detail` commands, not a Telegram message receiver. ([Bot FAQ](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get), [Bot API Message](https://core.telegram.org/bots/api#message), [Bot API forwardMessage](https://core.telegram.org/bots/api#forwardmessage), [portal CLI contract](../../.agents/skills/portal-cli-addition/SKILL.md#L82-L113))

Forwarding is conditional on the source post allowing it. If a post is protected, the user may need to paste its text or public link instead. Whether Afriwork protects any of its posts was not checked. ([Bot API Message](https://core.telegram.org/bots/api#message), [Bot API forwardMessage](https://core.telegram.org/bots/api#forwardmessage))

### Reading the public channel

Telegram's FAQ says bots receive posts from channels where they are members, and the Bot API represents new channel posts as `channel_post` updates. If Afriwork permits an integration bot to join `@freelance_ethio`, that gives a supported way to receive future channel posts without reading the applicant bot's private user chats. No bot was added to the channel during this research. ([Bot FAQ](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get), [Bot API Update](https://core.telegram.org/bots/api#update), [Afriwork channel](https://t.me/freelance_ethio))

The public `t.me/s/freelance_ethio` preview is readable without starting the applicant bot. A follow-up probe found that some posts expose only excerpts, and older-page pagination and long-term markup stability remain unverified. The repo's portal workflow allows a public HTML parser only when result and detail anchors are stable and real listing fields can be verified. See the follow-up findings below. ([public channel preview](https://t.me/s/freelance_ethio), [portal source classification](../../.agents/skills/portal-cli-addition/SKILL.md#L18-L29), [portal investigation gates](../../.agents/skills/portal-cli-addition/SKILL.md#L35-L59))

## Fit with this repository

The repo's `scrape` workflow discovers enabled `*-search` skills and uses their installed CLIs. Registered sources expose `search` and `detail` commands and a shared JSON result shape. The portal-addition guidance supports public JSON or stable public HTML sources; it says login-gated sources or sources without a stable public listing endpoint should remain fallback-only. ([scrape skill](../../.agents/skills/scrape/SKILL.md#L58-L72), [portal CLI contract](../../.agents/skills/portal-cli-addition/SKILL.md#L82-L113), [portal source classification](../../.agents/skills/portal-cli-addition/SKILL.md#L18-L29))

The repo already has a multi-board CLI for public JSON and RSS feeds. Its source notes show separate parsers per feed and a common result shape. At the time of the initial research, the README and installed skills did not list Afriwork. The current source is documented in `.agents/skills/afriwork-search/`. ([remote-search skill](../../.agents/skills/remote-search/SKILL.md#L13-L18), [repo README](../../README.md#L102-L114), [installed skills directory](../../.agents/skills/))

The initial assessment was **yes, conditionally**. The public channel is the best-supported route for job summaries. A manually forwarded or pasted posting would need a separate intake workflow. Directly monitoring the applicant bot's existing user conversations is not supported by the public Bot API evidence reviewed. ([portal investigation gates](../../.agents/skills/portal-cli-addition/SKILL.md#L35-L59), [portal live gates](../../.agents/skills/portal-cli-addition/SKILL.md#L151-L180), [Bot FAQ](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get), [Bot-to-Bot Communication](https://core.telegram.org/bots/features#bot-to-bot-communication))

## Open questions for full details or a broader integration

- Whether Afriwork offers an API, export, or feed to approved integrations that it does not document publicly. ([Afriwork site](https://afriworket.com/), [Afriwork Help Center](https://afriwork.tawk.help/))
- Whether Afriwork will authorize a third-party bot to join the public channel, and whether Telegram's Bot-to-Bot Communication Mode is enabled for `@afriworkapplicantbot`. ([Afriwork channel](https://t.me/freelance_ethio), [Bot-to-Bot Communication](https://core.telegram.org/bots/features#bot-to-bot-communication))
- Whether Afriwork offers an approved route for complete descriptions. The CLI returns the public channel text and preserves the Mini App link when the post provides one. ([public channel preview](https://t.me/s/freelance_ethio), [portal CLI result fields](../../.agents/skills/portal-cli-addition/SKILL.md#L102-L113))
- Whether Afriwork's terms permit automated, low-volume personal collection from the public channel or website. Disable the CLI if Afriwork says collection is not allowed. ([portal investigation guidance](../../.agents/skills/portal-cli-addition/SKILL.md#L31-L33))

## Follow-up probe (2026-09-23)

- The channel preview shows numeric message IDs and an older-post link using `?before=<id>`. A live search followed that cursor through five pages. Longer-range pagination and long-term ID stability remain unverified. ([channel preview](https://t.me/s/freelance_ethio))
- Some preview posts contain a readable short description. Others end with an excerpt and a "view details" link. The direct public URL for post `103756` returned an embed wrapper; its preview route returned a page of channel posts. Full descriptions are not consistently available from the preview without opening the Mini App. ([post 103756](https://t.me/freelance_ethio/103756), [preview route](https://t.me/s/freelance_ethio/103756), [channel preview](https://t.me/s/freelance_ethio))
- Afriwork's [`robots.txt`](https://afriworket.com/robots.txt) allows `/` and disallows `/cgi-bin/`, but it does not establish permission under Afriwork's terms. The site's [`/terms-of-service` page](https://afriworket.com/terms-of-service) displayed a Privacy Policy heading during this probe. Telegram's [`t.me/robots.txt`](https://t.me/robots.txt) returned 404. The collection terms remain unresolved.
- A request for a nonexistent channel post displayed generic channel information without an observable HTTP status, so missing-post behavior remains unresolved. ([nonexistent post probe](https://t.me/freelance_ethio/999999999999))

The `afriwork-search` CLI now searches the public channel and returns the text Afriwork publishes there, plus its official applicant-app link. Some posts contain excerpts, so the CLI marks that status instead of implying it has full Mini App details. Afriwork's collection terms remain unclear. The skill is limited to low-volume personal use. If Afriwork disallows collection, disable the source. An approved API or feed is still needed for complete descriptions.

## Sources consulted

- Afriwork: [home](https://afriworket.com/), [jobs](https://afriworket.com/jobs), [Find Work](https://afriworket.com/find-work), [FAQ](https://afriworket.com/faq), [sitemap](https://afriworket.com/sitemap.xml), [Help Center](https://afriwork.tawk.help/).
- Telegram: [applicant bot page](https://t.me/afriworkapplicantbot), [Afriwork channel page](https://t.me/freelance_ethio), [public channel preview](https://t.me/s/freelance_ethio), [Bot FAQ](https://core.telegram.org/bots/faq), [Bot API](https://core.telegram.org/bots/api), [Bot Features](https://core.telegram.org/bots/features#bot-to-bot-communication), [Bot API changelog](https://core.telegram.org/bots/api-changelog#may-8-2026).
- Repository: [portal addition workflow](../../.agents/skills/portal-cli-addition/SKILL.md), [scrape workflow](../../.agents/skills/scrape/SKILL.md), [remote-search skill](../../.agents/skills/remote-search/SKILL.md), [README](../../README.md).
