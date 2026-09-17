# Ashby CLI

This CLI searches the configured public Ashby boards directly. It uses the
shared adapter in `.agents/lib/direct-careers/` and needs only Bun at runtime.

```bash
bun run src/cli.ts search -q "software engineer" --jobage 14 --limit 20 --format table
```

Run `detail <board:id>` with an ID from the search output to read the full posting.

Run `bun run test:live` for a low-volume search-to-detail smoke test.
