import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import tempfile
import unittest

from PIL import Image, ImageDraw

from stretch_flags import auxiliary_flags, blob_gray_zone_flag


class AuxiliaryFlagsTests(unittest.TestCase):
    def test_flags_aspect_ratio_outlier(self):
        files = {
            "resized": {
                "path": "unused.webp",
                "exists": True,
                "sha256": "unused",
                "width": 1200,
                "height": 400,
                "decodable": True,
                "bytes": 1,
            }
        }
        self.assertEqual(auxiliary_flags(files), ["aspect_ratio_outlier"])

    def test_flags_low_resolution(self):
        files = {
            "resized": {
                "path": "unused.webp",
                "exists": True,
                "sha256": "unused",
                "width": 399,
                "height": 200,
                "decodable": True,
                "bytes": 1,
            }
        }
        self.assertEqual(auxiliary_flags(files), ["low_resolution"])

    def test_skips_missing_or_invalid_probe(self):
        self.assertEqual(auxiliary_flags({}), [])
        self.assertEqual(
            auxiliary_flags(
                {"resized": {"exists": True, "decodable": False, "width": 1200, "height": 200}}
            ),
            [],
        )
        self.assertEqual(
            auxiliary_flags(
                {"resized": {"exists": True, "decodable": True, "width": 0, "height": 200}}
            ),
            [],
        )


class BlobGrayZoneFlagTests(unittest.TestCase):
    def assert_blob_flag(self, rectangles, expected):
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = pathlib.Path(temporary_directory) / "fixture.webp"
            image = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            for rectangle in rectangles:
                draw.rectangle(rectangle, fill=(255, 255, 255, 255))
            image.save(path, "WEBP", lossless=True)
            self.assertEqual(blob_gray_zone_flag(path), expected)

    def test_flags_second_blob_at_fifteen_percent(self):
        self.assert_blob_flag([(5, 5, 24, 24), (50, 5, 59, 10)], ["blob_ratio_gray_zone"])

    def test_ignores_tiny_fragment(self):
        self.assert_blob_flag([(5, 5, 24, 24), (50, 5, 53, 6)], [])

    def test_ignores_equal_blobs(self):
        self.assert_blob_flag([(5, 5, 24, 24), (50, 5, 69, 24)], [])

    def test_missing_path_returns_no_flag(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            missing = pathlib.Path(temporary_directory) / "missing.webp"
            self.assertEqual(blob_gray_zone_flag(missing), [])


if __name__ == "__main__":
    unittest.main()
