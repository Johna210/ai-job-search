# Contributing

This repository is a portable template. Contributions must work through `AGENTS.md` and `.agents/skills/` without requiring one coding agent.

## Keep one workflow source

Put every complete workflow in `.agents/skills/<name>/SKILL.md`.

Runtime-specific files may configure permissions, MCP servers, models, or optional agents. They may not copy workflow instructions. Do not add `.claude/`, `.opencode/commands/`, or `.opencode/skills/` workflow trees.

Use natural-language triggers as the common interface. Runtime command syntax is optional.

## Suitable contributions

- Correctness fixes with a reproduced failure.
- Portable workflow improvements.
- Security checks for untrusted input, personal data, permissions, or dependencies.
- Documentation that fixes a verified gap.
- Portal CLI improvements that preserve the existing CLI contract.
- Country-neutral sources and reusable portal infrastructure.

Keep market-specific portals in a fork unless the portal demonstrates a reusable integration pattern.

Never submit populated candidate profiles, imported career documents, trackers, or application archives.

## Add or change a skill

Use this structure:

```text
.agents/skills/<name>/
├── SKILL.md
├── references/       # optional
├── scripts/          # optional
└── cli/              # optional portal CLI
```

The `name` in `SKILL.md` must match its directory. Keep frontmatter portable. Do not add vendor fields such as `allowed-tools`, `context`, `agent`, `mode`, or `permission`.

Describe actions by capability. Write "search the web" instead of naming a harness tool. If a workflow benefits from parallel workers, provide a sequential fallback.

## Portal CLI contract

Portal CLIs provide:

- `search` and `detail` commands where the source supports both.
- `--format json`, `--format table`, and `--format plain`.
- Machine-readable errors on stderr and a nonzero exit code.
- Bounded retries for rate limits and temporary server errors.
- No runtime dependencies unless the integration requires them.
- Low-volume, read-only access to public endpoints.

Do not bypass authentication, bot protection, or access controls.

## Prove the change

Reproduce bugs through the path users run. A unit test with an impossible input does not prove a workflow bug.

Run the core checks:

```bash
python3 tools/lint_skills.py
python3 tools/check_harness_compat.py
python3 tools/check_framework_version.py
python3 tools/security_guards.py
python3 -m unittest discover -s tests -t . -v
```

For a changed portal CLI, also run these commands in its `cli/` directory:

```bash
bun install
bun run typecheck
bun test
```

Compile both stock document templates after changing LaTeX, fonts, or document rules.

## Keep changes reviewable

Use one concern per pull request. Explain the failing case, the fix, and the command that proves it.

Check the target repository before opening a pull request from a personalized fork. GitHub may default to the upstream repository.
