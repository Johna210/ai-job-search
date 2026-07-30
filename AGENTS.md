---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

This workspace is structured to manage job search activities, scraper tools, CVs, cover letters, and interview preparation.

## Thin-Pointer Design (Single Source of Truth)

To prevent duplication and configuration drift across different AI agent frameworks (OpenCode, Claude Code, Google Antigravity, Codex, Cursor, Gemini CLI, etc.), this workspace uses a unified thin-pointer design. All agent runtimes should load the canonical specifications and candidate profiles from the files and directories below:

1. **Personal Candidate Profile:**
   - The candidate profile, contact details, education, and target preferences are defined in [CLAUDE.md](CLAUDE.md) and the individual profile methodology files under [.opencode/skills/job-application-assistant/](.opencode/skills/job-application-assistant/) (specifically `01-*.md` etc.).
2. **Canonical Workflow Specifications:**
   - The step-by-step instructions and triggers for tasks (setup, scrape, rank, apply, upskill, interview) are defined in the [.opencode/skills/](.opencode/skills/) directory.
   - Do not duplicate these rules or specifications. Treat `.opencode/skills/` files as the single source of truth.
3. **Portal Search Skills:**
   - Job-portal search CLIs live under [.agents/skills/](.agents/skills/) in the portable Agent Skills format (with a `SKILL.md` per portal). All frameworks discover these automatically; the `/scrape` workflow in [.opencode/skills/job-scraper/](.opencode/skills/job-scraper/) orchestrates them.

## OpenCode Configuration

OpenCode discovers this project's configuration from:

- **Skills:** `.opencode/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md` (auto-discovered)
- **Commands:** `.opencode/commands/*.md` (custom commands with `/` prefix)
- **Agents:** `.opencode/agents/*.md` (specialized subagents)
- **Rules:** `AGENTS.md` (this file) and `CLAUDE.md` (fallback)
- **Config:** `opencode.json` (permissions and settings)

## Tool Name Mapping (OpenCode)

When executing commands in OpenCode, use these tool names:

| Concept | OpenCode Tool |
|---------|---------------|
| Read a file | `read` |
| Write a file | `write` |
| Edit a file | `edit` |
| Run shell command | `bash` |
| Find files by pattern | `glob` |
| Search file contents | `grep` |
| Fetch a URL | `webfetch` |
| Search the web | `websearch` |
| Ask the user a question | `question` |
| Spawn a subagent | `task` (with `subagent_type: "general"`) |

**Subagent invocation:** To spawn a subagent, use the `task` tool with:
- `description`: short task summary
- `prompt`: the full instructions
- `subagent_type`: `"general"` (for general-purpose agents) or `"explore"` (for read-only exploration)

Skills provide specialized instructions and workflows for specific tasks.
Use the skill tool to load a skill when a task matches its description.
