# Afriwork source implementation plan

This plan builds on the [Afriwork Telegram integration research](afriwork-telegram-integration.md).

## Current decision

The `afriwork-search` CLI is implemented and enabled for low-volume personal searches. It reads public channel posts, marks descriptions that contain an excerpt, and preserves the official applicant-app link. It does not retrieve Mini App data. Afriwork's collection terms remain unclear, so disable the source if Afriwork disallows collection. An approved feed or API is still needed for complete descriptions.

## Goal

Expose public Afriwork channel posts to `/scrape` through a low-volume `afriwork-search` CLI. Full Mini App listings remain out of scope.

## Source choice

The CLI reads Afriwork's public [@freelance_ethio channel](https://t.me/s/freelance_ethio). Afriwork links to this channel, and its posts include job summaries and links to the applicant Mini App. The research found no documented public jobs API, RSS feed, or export. The channel preview is a public source, not a documented developer API.

Do not build against the applicant bot's private user conversations. The Telegram Bot API does not expose another bot's conversation history. Bot-to-bot messaging requires both bots to opt in and does not grant access to existing user chats.

## Verified source constraints

The public preview exposes job cards, numeric message IDs, publication times, and `before` cursors. A live five-page search found developer postings, and detail lookup returned the selected channel post. The preview does not expose complete details for every posting. The terms page displayed a Privacy Policy heading during the check, so collection permission remains unclear.

The CLI uses only public channel HTML. It does not open the applicant Mini App, read private bot conversations, or submit applications. It scans at most five channel pages per search and labels excerpted descriptions.

## CLI design

The source lives under `.agents/skills/afriwork-search/`. It uses the repository's `search` and `detail` CLI contract and generic helpers from `.agents/lib/direct-careers/`. Afriwork-specific HTML parsing stays in the source CLI. No changes to the shared `scrape` workflow were needed.

The CLI exposes the repository contract:

```bash
bun run .agents/skills/afriwork-search/cli/src/cli.ts search [flags]
bun run .agents/skills/afriwork-search/cli/src/cli.ts detail <id|url> [flags]
```

The CLI uses IDs such as `afriwork:<channel-message-id>` and canonical channel post URLs. It paginates through at most five channel pages, then applies query, location, age, and workplace filters locally. It filters workplace only when the post labels a mode.

Search returns the standard `meta` and `results` object. Each result includes `id`, `title`, `company`, `location`, `date`, and `url`, plus available salary, deadline, employment type, and applicant-app link fields. Detail returns the public channel description, marks excerpts, and preserves paragraph breaks.

The CLI uses Bun's built-in `fetch` and existing parsing helpers without runtime dependencies. It reports errors as JSON on stderr and uses bounded retries for 429 and 5xx responses.

## Validation

The CLI has parser fixture tests and CLI contract tests for output, help, and invalid arguments. Its live smoke test searches recent developer posts and fetches one result by ID.

Run these checks from the CLI directory:

```bash
bun run typecheck
bun run test
bun run test:live
bun run src/cli.ts search -q "backend developer" --location "Addis Ababa" --limit 5 --format json
bun run src/cli.ts detail <returned-id> --format plain
```

The live checks passed. Search returned five developer postings from five channel pages. Detail returned a readable public post and marked its description as an excerpt. The CLI contract test confirmed that an invalid flag produces a JSON error on stderr and exits with code 1.

The skill is enabled with a personal-use warning because the terms remain unclear. The `site:t.me/s/freelance_ethio` query in `profile/search.md` is a fallback; its search-engine coverage has not been verified.

## Out of scope for the first version

- Reading private conversations with `@afriworkapplicantbot`.
- Logging in as a Telegram user or using an undocumented Mini App endpoint.
- Applying to jobs or messaging Afriwork through the CLI.
- Receiving live channel updates through a new Telegram bot. That route would need Afriwork's permission to add the bot and a separate decision about credentials and runtime hosting.
