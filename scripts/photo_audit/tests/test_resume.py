import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import json
import subprocess
import tempfile
import unittest


class ResumeDeterminismTests(unittest.TestCase):
    repo_root = pathlib.Path(__file__).resolve().parents[3]
    audit_script = repo_root / "scripts/photo_audit/run_audit.py"

    def _run_audit(self, out_dir, resume=False):
        command = [
            sys.executable,
            str(self.audit_script),
            "--repo-root",
            str(self.repo_root),
            "--out-dir",
            str(out_dir),
            "--limit",
            "40",
        ]
        if resume:
            command.append("--resume")
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_resumed_run_is_byte_identical(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = pathlib.Path(temporary_directory)
            clean_dir = root / "clean"
            resumed_dir = root / "resumed"

            self._run_audit(clean_dir)
            expected_jsonl = (clean_dir / "photo_audit.jsonl").read_bytes()
            expected_summary = (clean_dir / "photo_audit_summary.json").read_bytes()

            self._run_audit(resumed_dir)
            checkpoint = resumed_dir / ".audit_checkpoint.jsonl"
            checkpoint_lines = checkpoint.read_text(encoding="utf-8").splitlines(keepends=True)
            self.assertGreaterEqual(len(checkpoint_lines), 25)
            checkpoint.write_text("".join(checkpoint_lines[:15]), encoding="utf-8", newline="\n")
            (resumed_dir / "photo_audit.jsonl").unlink()
            (resumed_dir / "photo_audit_summary.json").unlink()

            self._run_audit(resumed_dir, resume=True)
            self.assertEqual(
                (resumed_dir / "photo_audit.jsonl").read_bytes(),
                expected_jsonl,
            )
            self.assertEqual(
                (resumed_dir / "photo_audit_summary.json").read_bytes(),
                expected_summary,
            )

            receipt = json.loads(
                (resumed_dir / "run_receipt_T04.json").read_text(encoding="utf-8")
            )
            self.assertGreater(receipt["fixturesFromCheckpoint"], 0)
            gaps = json.loads(
                (resumed_dir / "missing_or_replacement_species.json").read_text(
                    encoding="utf-8"
                )
            )
            gap_ids = [record["gapId"] for record in gaps["records"]]
            self.assertEqual(len(gap_ids), len(set(gap_ids)))


if __name__ == "__main__":
    unittest.main()
