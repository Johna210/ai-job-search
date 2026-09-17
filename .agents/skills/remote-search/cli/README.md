# Remote search CLI

This CLI searches six public remote-job feeds through one shared contract:

- Himalayas
- We Work Remotely
- Remote OK
- Remotive
- Working Nomads
- Jobicy

The parsers use Bun's built-in `fetch` and no runtime dependencies. RSS feeds
are parsed with the small XML field reader in `src` because the feeds only need
item boundaries and a fixed set of scalar fields. HTML descriptions are decoded
and converted to readable text before they enter the shared result contract.

Run `bun run typecheck`, `bun run test`, and `bun run test:live` from this
directory. The live test makes one search and one detail request per run.
