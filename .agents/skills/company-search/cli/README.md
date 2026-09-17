# Company search CLI

This CLI searches official career pages for:

- Deliveroo
- Zalando
- OVHcloud
- Automattic

The parsers use Bun's built-in `fetch` and no runtime dependencies. The CLI uses
the official JSON endpoint where one exists, and small source-specific HTML
parsers for the other pages. It does not bypass access checks.

Run `bun run typecheck`, `bun run test`, and `bun run test:live` from this
directory. The live test makes one search and one detail request.
