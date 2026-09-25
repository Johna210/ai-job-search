# Afriwork search CLI

This CLI searches the public Telegram preview for Afriwork jobs. It uses Bun's built-in `fetch` and the repository's shared HTML and CLI helpers. It has no runtime dependencies.

The public posts provide searchable job cards and a Telegram Mini App link. Some descriptions are excerpts. The CLI preserves that status and does not open the Mini App.

Run `bun run typecheck`, `bun run test`, and `bun run test:live` from this directory. The live smoke test searches recent posts and fetches one matching public post.
