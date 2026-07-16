import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import tempfile
import unittest

from stretch_orphans import find_orphan_media


class FindOrphanMediaTests(unittest.TestCase):
    def test_finds_sorted_orphans_and_preserves_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            repo_root = pathlib.Path(temporary_directory)
            files = {
                "zukan_cards/original/MALE.jpg": b"male",
                "zukan_cards/original/FEMALE.jpg": b"female",
                "zukan_cards/original/z_orphan.jpg": b"z",
                "zukan_cards/original/a_orphan.jpg": b"a",
                "zukan_cards/processed/MALE_L2_grade.webp": b"display",
                "zukan_cards/processed/FEMALE_resized.jpg": b"resized",
                "zukan_cards/processed/z_orphan.webp": b"z",
                "zukan_cards/processed/a_orphan.webp": b"a",
                "zukan_cards/thumb/MALE_54.webp": b"thumb",
                "zukan_cards/thumb/FEMALE_108.webp": b"thumb",
                "zukan_cards/thumb/z_orphan.webp": b"z",
                "zukan_cards/thumb/a_orphan.webp": b"a",
                "zukan_cards/metadata/MALE.json": b"{}",
                "zukan_cards/metadata/FEMALE.json": b"{}",
                "zukan_cards/metadata/z_orphan.json": b"{}",
                "zukan_cards/metadata/a_orphan.json": b"{}",
            }
            for relative_path, content in files.items():
                path = repo_root / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)

            catalog = {
                "male": {"image": {
                    "version": "zukan_cards/original/MALE.jpg",
                    "display": "zukan_cards/processed/MALE_L2_grade.webp",
                    "thumb54": "zukan_cards/thumb/MALE_54.webp",
                }},
                "female": {
                    "image": {},
                    "image_female": {
                        "version": "zukan_cards/original/FEMALE.jpg",
                        "resized": "zukan_cards/processed/FEMALE_resized.jpg",
                        "thumb108": "zukan_cards/thumb/FEMALE_108.webp",
                    },
                },
            }
            before = {path: (repo_root / path).read_bytes() for path in files}

            result = find_orphan_media(repo_root, catalog)

            expected_orphans = {
                bucket: [f"zukan_cards/{bucket}/a_orphan.{extension}",
                         f"zukan_cards/{bucket}/z_orphan.{extension}"]
                for bucket, extension in {
                    "original": "jpg", "processed": "webp",
                    "thumb": "webp", "metadata": "json",
                }.items()
            }
            self.assertEqual(result, {
                "counts": {"original": 2, "processed": 2, "thumb": 2,
                           "metadata": 2, "total": 8},
                "orphans": expected_orphans,
            })
            self.assertEqual(
                before,
                {path: (repo_root / path).read_bytes() for path in files},
            )
            self.assertEqual(set(files), {
                path.relative_to(repo_root).as_posix()
                for path in repo_root.rglob("*") if path.is_file()
            })

    def test_missing_directories_are_empty(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            result = find_orphan_media(pathlib.Path(temporary_directory), {})

        self.assertEqual(result, {
            "counts": {"original": 0, "processed": 0, "thumb": 0,
                       "metadata": 0, "total": 0},
            "orphans": {bucket: [] for bucket in
                        ("original", "processed", "thumb", "metadata")},
        })


if __name__ == "__main__":
    unittest.main()
