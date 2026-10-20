"""Prove the actual import contract rejects UI/cloud coupling in offline code."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ArchitectureGateTest(unittest.TestCase):
    def test_rejects_cloud_and_transport_imports(self):
        for module, dependency in (("routing", "app.foundry"), ("analysis", "fastapi")):
            with self.subTest(module=module), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                shutil.copytree(ROOT / "backend/app", root / "app",
                                ignore=shutil.ignore_patterns("__pycache__"))
                target = root / "app" / f"{module}.py"
                with target.open("a", encoding="utf-8") as handle:
                    handle.write(f"\nimport {dependency}\n")
                result = subprocess.run(
                    [str(Path(sys.executable).with_name("lint-imports.exe" if os.name == "nt" else "lint-imports")),
                     "--config", str(ROOT / ".importlinter"), "--no-cache"],
                    cwd=root, env={**os.environ, "PYTHONPATH": str(root)},
                    capture_output=True, text=True, check=False,
                )
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("Offline analysis stays independent of transport and cloud BROKEN", result.stdout)


if __name__ == "__main__":
    unittest.main()
