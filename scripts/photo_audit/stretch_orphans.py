"""Find unreferenced photo audit files.

Example: ``find_orphan_media(repo_root, catalog)``
"""

import pathlib


_BUCKETS = ("original", "processed", "thumb", "metadata")
_MEDIA_SUFFIXES = ("_resized", "_L2_grade", "_54", "_108", "_216")


def _media_stem(path: str) -> str:
    stem = pathlib.PurePosixPath(path).stem
    for suffix in _MEDIA_SUFFIXES:
        if stem.endswith(suffix):
            return stem[: -len(suffix)]
    return stem


def find_orphan_media(repo_root: pathlib.Path, catalog: dict) -> dict:
    '''List files under zukan_cards that no catalog entry references.'''
    references: set[str] = set()
    for entry in catalog.values():
        for image_key in ("image", "image_female"):
            image = entry.get(image_key)
            if isinstance(image, dict):
                references.update(value for value in image.values() if isinstance(value, str))

    media_stems = {_media_stem(path) for path in references}
    orphans: dict[str, list[str]] = {}
    for bucket in _BUCKETS:
        directory = repo_root / "zukan_cards" / bucket
        paths = sorted(path for path in directory.rglob("*") if path.is_file()) if directory.is_dir() else []
        relative_paths = (path.relative_to(repo_root).as_posix() for path in paths)
        if bucket == "metadata":
            orphans[bucket] = [
                path for path in relative_paths
                if pathlib.PurePosixPath(path).suffix.lower() != ".json"
                or pathlib.PurePosixPath(path).stem not in media_stems
            ]
        else:
            orphans[bucket] = [path for path in relative_paths if path not in references]

    counts = {bucket: len(orphans[bucket]) for bucket in _BUCKETS}
    counts["total"] = sum(counts.values())
    return {"counts": counts, "orphans": orphans}
