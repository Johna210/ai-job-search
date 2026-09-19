#!/usr/bin/env python3
"""Lint the repo's portable Agent Skills.

Run from anywhere: python tools/lint_skills.py

Checks:
- Every .agents/skills/*/SKILL.md has YAML frontmatter that
  parses, with non-empty `name` and `description` keys
- Frontmatter uses only fields from the Agent Skills specification
- Skill names match their directory names and are unique

Exit code 0 on success, 1 with a failure list otherwise.
"""

import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("lint_skills.py requires PyYAML: pip install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []
ALLOWED_FIELDS = {"name", "description", "license", "compatibility", "metadata"}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def check_skill(path: Path) -> str | None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"{rel(path)}: missing YAML frontmatter (file must start with ---)")
        return None
    end = text.find("\n---", 4)
    if end == -1:
        errors.append(f"{rel(path)}: unterminated YAML frontmatter")
        return None
    try:
        data = yaml.safe_load(text[4:end])
    except yaml.YAMLError as exc:
        errors.append(f"{rel(path)}: frontmatter is not valid YAML: {exc}")
        return None
    if not isinstance(data, dict):
        errors.append(f"{rel(path)}: frontmatter did not parse to a mapping")
        return None
    for key in ("name", "description"):
        if not data.get(key):
            errors.append(f"{rel(path)}: frontmatter missing required key '{key}'")

    description = data.get("description")
    if isinstance(description, str) and len(description) > 1024:
        errors.append(
            f"{rel(path)}: description exceeds 1024 characters ({len(description)})"
        )

    for key in sorted(set(data) - ALLOWED_FIELDS):
        errors.append(f"{rel(path)}: unsupported top-level frontmatter key '{key}'")

    name = data.get("name")
    if isinstance(name, str) and name != path.parent.name:
        errors.append(f"{rel(path)}: skill name {name!r} must match directory {path.parent.name!r}")

    metadata = data.get("metadata")
    if metadata is not None and (
        not isinstance(metadata, dict)
        or not all(isinstance(key, str) and isinstance(value, str) for key, value in metadata.items())
    ):
        errors.append(f"{rel(path)}: metadata must map strings to strings")
    return name if isinstance(name, str) else None


def main() -> int:
    skills = sorted(ROOT.glob(".agents/skills/*/SKILL.md"))
    if not skills:
        errors.append("no SKILL.md files found under .agents/skills/")

    names: set[str] = set()
    for skill in skills:
        name = check_skill(skill)
        if name in names:
            errors.append(f"{rel(skill)}: duplicate skill name {name!r}")
        if name:
            names.add(name)

    if errors:
        print(f"lint_skills: {len(errors)} failure(s)")
        for err in errors:
            print(f"  - {err}")
        return 1
    print(f"lint_skills: OK ({len(skills)} portable skills)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
