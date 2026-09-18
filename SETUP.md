# Setup

This guide prepares the repository for OpenCode, Codex, or Pi. You need one coding agent. Bun, Python, Poppler, and a TeX distribution enable the complete workflow.

## 1. Install a supported agent

Use one of these agents:

- [OpenCode](https://opencode.ai/docs/)
- [OpenAI Codex](https://developers.openai.com/codex/cli/)
- [Pi](https://github.com/earendil-works/pi)

Open the repository root after installation. Each agent reads `AGENTS.md` and discovers `.agents/skills/`.

## 2. Install Git and Python

Install Git and Python 3.11 or later with your operating system's package manager. Check both commands:

```bash
git --version
python3 --version
```

The Python tools use the standard library except for the skill linter:

```bash
python3 -m pip install pyyaml
```

## 3. Install Bun for job searches

Portal CLIs use Bun. Follow the [Bun installation guide](https://bun.sh/docs/installation), then check the installation:

```bash
bun --version
```

Without Bun, `scrape` can use web search when the current agent provides it.

## 4. Install PDF tools

The stock CV uses LuaLaTeX. The stock cover letter uses XeLaTeX. Install a TeX distribution that provides both commands.

Linux packages commonly include:

```bash
sudo apt install texlive-luatex texlive-xetex texlive-fonts-extra poppler-utils
```

On macOS, install MacTeX and Poppler. On Windows, install MiKTeX or TeX Live and Poppler.

Check the commands:

```bash
lualatex --version
xelatex --version
pdftotext -v
pdfinfo -v
```

`pdftotext` and `pdfinfo` are optional. Without them, the workflow reports that mechanical ATS and page-count checks are unavailable.

## 5. Create your fork

Keep your populated profile in a private fork because `profile/candidate.md` contains personal data.

```bash
git clone <your-fork-url>
cd ai-job-search
```

Do not commit files ignored by `.gitignore`. These include imported documents, tailored applications, trackers, salary data, and generated reports.

## 6. Build your profile

Open the repository in your agent and ask:

```text
Set up my job-search profile.
```

Choose one setup path:

1. Put several source documents under `documents/` and ask the agent to import them.
2. Give the agent one CV.
3. Answer the setup interview questions.

The setup workflow writes:

- `profile/candidate.md`
- `profile/behavior.md`
- `profile/search.md`
- `cv/main_example.tex`

Review these files before using them. Resolve conflicting dates, titles, or metrics against original documents.

## 7. Compile the templates

Compile the example CV:

```bash
cd cv
lualatex -interaction=nonstopmode -halt-on-error main_example.tex
cd ..
```

Compile the example cover letter:

```bash
cd cover_letters
xelatex -interaction=nonstopmode -halt-on-error cover_example.tex
cd ..
```

Open both PDFs and inspect their layout.

## 8. Run a first workflow

Use natural language with every supported agent:

```text
Find new jobs matching my profile.
```

Invocation shortcuts differ by agent:

| Agent | Explicit skill invocation |
|---|---|
| OpenCode | Ask naturally or let the agent select the skill |
| Codex | `$scrape` or `/skills` |
| Pi | `/skill:scrape` |

Then evaluate one result:

```text
Evaluate job number 1. Do not draft anything until I approve the fit assessment.
```

## 9. Optional integrations

The `gmail-sync` and `notion-sync` skills use authenticated integration tools supplied by the current agent. They stop cleanly when those tools are unavailable.

Pi has no built-in MCP client. Use a trusted extension if you need these integrations, or skip them.

## 10. Verify the repository

Run the static checks:

```bash
python3 tools/lint_skills.py
python3 tools/check_harness_compat.py
python3 tools/security_guards.py
python3 -m unittest discover -s tests -t . -v
```

Run portal CLI tests from each changed CLI directory:

```bash
bun install
bun run typecheck
bun test
```

Live portal smoke tests are manual because they call third-party services.

## 11. Pull upstream updates

Commit your profile changes before pulling updates:

```bash
git status
git add profile cv/main_example.tex
git commit -m "chore: update candidate profile"
```

Check framework versions against an upstream remote:

```bash
python3 tools/check_upstream_updates.py
```

Review and merge updates manually. The repository does not merge or update itself.

## Troubleshooting

If an agent does not load the project instructions, start it from the repository root and confirm that `AGENTS.md` exists.

If an agent does not discover a skill, confirm that the file is at `.agents/skills/<name>/SKILL.md` and that its `name` matches the directory.

If a PDF compile fails, read the first error in the `.log` file. Missing fonts and TeX packages cause most first-run failures.

If a portal returns no jobs, run that portal's documented health or smoke command before changing the scraper.
