#!/usr/bin/env python3
"""Check the repository's portable agent contract."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REQUIRED_PATHS = {
    "AGENTS.md",
    "profile/candidate.md",
    "profile/behavior.md",
    "profile/search.md",
}
REQUIRED_SKILLS = {
    "setup",
    "scrape",
    "rank",
    "apply",
    "interview",
    "outcome",
    "upskill",
}
FORBIDDEN_PATHS = {
    "CLAUDE.md",
    ".claude",
    ".opencode/commands",
    ".opencode/skills",
}
FORBIDDEN_SKILL_PATTERNS = {
    r"(?m)^(?:allowed-tools|context|model|agent|mode|permission):": "vendor-only frontmatter",
    r"\.opencode/(?:commands|skills)/": "OpenCode workflow path",
    r"\.claude/": "Claude workflow path",
    r"\bCLAUDE\.md\b": "Claude instruction file",
    r"\$ARGUMENTS\b": "vendor command substitution",
    r"\b(?:task|Agent|Read|Write|Edit|WebFetch|WebSearch|AskUserQuestion) tool\b": "vendor tool name",
    r"\b(?:call|use) (?:the )?(?:Task|Agent|Read|Write|Edit|WebFetch|WebSearch|AskUserQuestion)\b": "vendor tool call",
    r"(?:^|[\s`\"'])/(?:add-portal|add-template|apply|expand|gmail-sync|html-report|interview|notion-sync|outcome|rank|reset|scrape|setup|upskill)(?=[\s`\"'<]|$)": "removed slash command",
}


def main() -> int:
    errors: list[str] = []

    for relpath in sorted(REQUIRED_PATHS):
        if not (ROOT / relpath).is_file():
            errors.append(f"missing portable project file: {relpath}")

    for relpath in sorted(FORBIDDEN_PATHS):
        if (ROOT / relpath).exists():
            errors.append(f"legacy harness path must not exist: {relpath}")

    skills = sorted((ROOT / ".agents" / "skills").glob("*/SKILL.md"))
    names = {path.parent.name for path in skills}
    skill_directories = {path.name for path in (ROOT / ".agents" / "skills").iterdir() if path.is_dir()}
    for name in sorted(REQUIRED_SKILLS - names):
        errors.append(f"missing canonical workflow skill: {name}")
    for name in sorted(skill_directories - names):
        errors.append(f"skill directory has no SKILL.md: {name}")

    agent_docs = skills + sorted((ROOT / ".agents" / "references").glob("**/*.md"))
    for path in agent_docs:
        text = path.read_text(encoding="utf-8")
        for pattern, label in FORBIDDEN_SKILL_PATTERNS.items():
            if re.search(pattern, text):
                errors.append(f"{path.relative_to(ROOT)}: contains {label}")

    if errors:
        print(f"harness_compat: {len(errors)} failure(s)")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"harness_compat: OK ({len(skills)} canonical skills)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
