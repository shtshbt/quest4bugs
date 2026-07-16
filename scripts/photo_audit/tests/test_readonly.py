import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import hashlib
import subprocess
import tempfile
import unittest


class ReadOnlyAuditTests(unittest.TestCase):
    repo_root = pathlib.Path(__file__).resolve().parents[3]
    audit_script = repo_root / "scripts/photo_audit/run_audit.py"

    def _sha256(self, path):
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _production_manifest(self):
        js_files = (
            self.repo_root / "zukan_config/zukan_catalog.js",
            self.repo_root / "shared/bugs.js",
        )
        js_manifest = {
            path.relative_to(self.repo_root).as_posix(): self._sha256(path)
            for path in js_files
        }
        media_root = self.repo_root / "zukan_cards"
        # The JS files are mutation-prone, so they receive full hashes. For the
        # media tree, path, size, and mtime_ns detect writes without hashing all data.
        media_manifest = tuple(
            (
                path.relative_to(self.repo_root).as_posix(),
                path.stat().st_size,
                path.stat().st_mtime_ns,
            )
            for path in sorted(media_root.rglob("*"))
            if path.is_file()
        )
        return js_manifest, media_manifest

    def _repo_output_manifest(self):
        # The committed deliverable lives at <repo>/photo_audit. A run directed at
        # another --out-dir must leave it exactly as it was, whether or not it exists.
        repo_output = self.repo_root / "photo_audit"
        if not repo_output.exists():
            return None
        return tuple(
            (path.relative_to(self.repo_root).as_posix(), path.stat().st_size, path.stat().st_mtime_ns)
            for path in sorted(repo_output.rglob("*"))
            if path.is_file()
        )

    def test_audit_does_not_write_to_production_paths(self):
        before = self._production_manifest()
        repo_output_before = self._repo_output_manifest()

        with tempfile.TemporaryDirectory() as temporary_directory:
            out_dir = pathlib.Path(temporary_directory)
            completed = subprocess.run(
                [
                    sys.executable,
                    str(self.audit_script),
                    "--repo-root",
                    str(self.repo_root),
                    "--out-dir",
                    str(out_dir),
                    "--limit",
                    "30",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            expected_artifacts = {
                ".audit_checkpoint.jsonl",
                "missing_or_replacement_species.json",
                "photo_audit.jsonl",
                "photo_audit_summary.json",
                "rejected_media.jsonl",
                "run_receipt_T04.json",
            }
            self.assertTrue(
                expected_artifacts.issubset({path.name for path in out_dir.iterdir()})
            )

        after = self._production_manifest()
        self.assertEqual(after, before)
        self.assertEqual(
            self._repo_output_manifest(),
            repo_output_before,
            "audit run touched the repo photo_audit directory",
        )


if __name__ == "__main__":
    unittest.main()
