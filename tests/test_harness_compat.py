import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class HarnessCompatibilityTests(unittest.TestCase):
    def test_portable_contract(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "tools" / "check_harness_compat.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("harness_compat: OK", result.stdout)

    def test_opencode_loads_only_canonical_instructions(self):
        text = (ROOT / "opencode.json").read_text(encoding="utf-8")
        self.assertIn('"instructions": ["AGENTS.md"]', text)


if __name__ == "__main__":
    unittest.main()
