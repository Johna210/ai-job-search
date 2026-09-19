import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
LINTER_SCRIPT = REPO_ROOT / "tools" / "lint_skills.py"


def run_linter(root: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(root / "tools" / "lint_skills.py")],
        capture_output=True,
        text=True,
    )


class LinterRepoFixture(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)

        tools = self.root / "tools"
        tools.mkdir()
        shutil.copy(LINTER_SCRIPT, tools / "lint_skills.py")
        # The Python-test CI job does not install PyYAML. This small parser is
        # enough for the frontmatter shapes exercised here.
        (tools / "yaml.py").write_text(
            "class YAMLError(Exception):\n"
            "    pass\n\n"
            "def safe_load(text):\n"
            "    data = {}\n"
            "    for line in text.splitlines():\n"
            "        if ':' in line and not line.startswith(' '):\n"
            "            key, value = line.split(':', 1)\n"
            "            data[key.strip()] = value.strip()\n"
            "    return data\n",
            encoding="utf-8",
        )

        self.skill = self.root / ".agents" / "skills" / "example" / "SKILL.md"
        self.skill.parent.mkdir(parents=True)
        self.write_skill("example", "Example skill")

    def write_skill(self, name: str, description: str):
        self.skill.write_text(
            f"---\nname: {name}\ndescription: {description}\n---\n",
            encoding="utf-8",
        )


class PortableSkillTests(LinterRepoFixture):
    def test_valid_skill_passes(self):
        result = run_linter(self.root)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("1 portable skills", result.stdout)

    def test_skill_name_must_match_directory(self):
        self.write_skill("other", "Example skill")
        result = run_linter(self.root)
        self.assertEqual(result.returncode, 1)
        self.assertIn("must match directory", result.stdout)

    def test_description_is_required(self):
        self.write_skill("example", "")
        result = run_linter(self.root)
        self.assertEqual(result.returncode, 1)
        self.assertIn("missing required key 'description'", result.stdout)

    def test_description_must_not_exceed_1024_characters(self):
        self.write_skill("example", "x" * 1025)
        result = run_linter(self.root)
        self.assertEqual(result.returncode, 1)
        self.assertIn("description exceeds 1024 characters (1025)", result.stdout)

    def test_nonstandard_top_level_field_is_rejected(self):
        self.skill.write_text(
            "---\nname: example\ndescription: Example skill\nenabled: true\n---\n",
            encoding="utf-8",
        )
        result = run_linter(self.root)
        self.assertEqual(result.returncode, 1)
        self.assertIn("unsupported top-level frontmatter key 'enabled'", result.stdout)

    def test_missing_skill_tree_fails_cleanly(self):
        shutil.rmtree(self.root / ".agents")
        result = run_linter(self.root)
        self.assertEqual(result.returncode, 1)
        self.assertIn("no SKILL.md files found under .agents/skills/", result.stdout)


if __name__ == "__main__":
    unittest.main()
