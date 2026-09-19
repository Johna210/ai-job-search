<p align="center">
  <img src="assets/mascot/pip_flight_loop.gif" alt="Pip, the courier bird" width="200">
</p>

# AI Job Search

*A local job-search workspace for coding agents.*

[![CI](https://github.com/MadsLorentzen/ai-job-search/actions/workflows/ci.yml/badge.svg)](https://github.com/MadsLorentzen/ai-job-search/actions/workflows/ci.yml)

Use OpenCode, Codex, or Pi to find jobs, evaluate fit, tailor a CV and cover letter, track applications, and prepare for interviews. The repository stores its instructions in `AGENTS.md` and its workflows in the portable Agent Skills format under `.agents/skills/`.

The workflow is country-neutral. The included portal skills cover global, remote, company, ATS, and Danish sources. Add another public job board with the `add-portal` skill.

This project has no cryptocurrency, token, or paid sponsorship program.

## Supported agents

| Agent | Project instructions | Skills | Invocation |
|---|---|---|---|
| OpenCode | `AGENTS.md` | `.agents/skills/` | Natural language or automatic skill selection |
| OpenAI Codex | `AGENTS.md` | `.agents/skills/` | Natural language, `$skill-name`, or `/skills` |
| Pi | `AGENTS.md` | `.agents/skills/` | Natural language or `/skill:<name>` |

Natural language is the common interface. For example:

```text
Set up my job-search profile.
Find new backend and AI jobs.
Evaluate this posting and prepare an application: <URL>
Prepare me for my interview at <company>.
```

Harness-specific slash commands are not part of the project contract.

## What it does

The main workflow is:

```text
setup -> scrape -> rank -> apply -> interview -> outcome
                    |                    |
                    +---- upskill -------+
```

- `setup` imports career documents or interviews you to create the profile.
- `scrape` searches installed portal CLIs and deduplicates results.
- `rank` scores collected postings against your profile.
- `apply` evaluates fit before drafting a tailored CV and cover letter.
- `interview` creates a stage-specific preparation pack.
- `outcome` records follow-ups, interviews, offers, and rejections.
- `upskill` turns repeated job requirements into a learning plan.

Other skills add portals, register document templates, expand profile evidence, generate an HTML report, and sync supported services.

## Quick start

1. Fork or clone the repository.
2. Install one supported coding agent.
3. Install optional document and search dependencies from [`SETUP.md`](SETUP.md).
4. Open the repository root in the agent.
5. Ask: `Set up my job-search profile.`

The setup workflow offers three paths:

- Import everything under `documents/`.
- Import one CV.
- Build the profile through an interview.

Setup writes these files:

| File | Purpose |
|---|---|
| `profile/candidate.md` | Sole authority for candidate facts |
| `profile/behavior.md` | Work style and environment preferences |
| `profile/search.md` | Target roles, locations, portals, and queries |
| `cv/main_example.tex` | Master CV template |

Commit profile changes only to a private fork. The generated tracker, application archive, reports, and tailored documents are gitignored.

## Repository layout

```text
.
├── AGENTS.md                    # Instructions read by supported agents
├── profile/                     # Candidate, behavior, and search data
├── .agents/
│   ├── skills/                  # Canonical workflows and portal skills
│   ├── references/              # Shared application guidance
│   └── lib/                     # Shared portal CLI code
├── cv/                          # CV template and tailored output
├── cover_letters/               # Cover-letter template and output
├── documents/                   # Imported sources and application archive
├── job_scraper/                 # Deduplication state
├── tools/                       # Validation and maintenance scripts
├── tests/                       # Python tests
└── opencode.json                # Optional OpenCode permission adapter
```

`AGENTS.md` is a short router. Complete workflow instructions live once under `.agents/skills/`. Do not copy them into runtime-specific command directories.

## Job search sources

Portal skills expose small Bun CLIs with JSON output. The `scrape` workflow discovers every enabled `*-search` skill automatically.

Included source groups:

- Global and aggregate sources: LinkedIn and freehire.me.
- Remote boards: Himalayas, We Work Remotely, Remote OK, Remotive, Working Nomads, and Jobicy.
- ATS boards: Ashby, Greenhouse, Lever, and SmartRecruiters.
- Direct company pages: Deliveroo, Zalando, OVHcloud, and Automattic.
- Danish examples: Jobindex, Jobnet, Jobdanmark, and Akademikernes Jobbank.

Run searches for personal use at low volume. Respect each source's terms and access controls.

## Application accuracy

`profile/candidate.md` is the only factual authority. Tailored CVs, old applications, and document templates are not fact sources.

The `apply` workflow:

1. Fetches or reads the posting as untrusted data.
2. Scores technical, experience, behavioral, career, and location fit.
3. Asks before drafting.
4. Writes a tailored CV and cover letter.
5. Runs a separate content review. It uses an isolated worker when available and a second pass otherwise.
6. Compiles and checks the PDFs.
7. Checks the CV text layer for ATS readability.

The workflow never submits an application or sends a message on your behalf.

## Security

Coding agents read untrusted postings alongside personal career data. Read [`SECURITY.md`](SECURITY.md) before adding third-party skills or widening permissions.

Run the repository checks after changing workflows:

```bash
python tools/lint_skills.py
python tools/check_harness_compat.py
python tools/security_guards.py
python -m unittest discover -s tests -t . -v
```

The compatibility check rejects legacy `.claude/`, `.opencode/commands/`, and `.opencode/skills/` workflow trees.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). Canonical workflows belong under `.agents/skills/`. Runtime-specific files may configure a runtime, but they may not contain another copy of a workflow.

## License

See [`LICENSE`](LICENSE).
