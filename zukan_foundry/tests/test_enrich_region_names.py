"""地域 seed 名称 enrichment の offline 回帰テスト。"""

import json
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(ROOT))

from tools.komorebi import enrich_region_names


@pytest.fixture
def offline_paths(tmp_path):
    seeds_path = tmp_path / "seeds.jsonl"
    cache_path = tmp_path / "cache.json"
    out_path = tmp_path / "enriched.jsonl"
    report_path = tmp_path / "report.md"
    seeds_path.write_bytes((FIXTURES / "enrich_region_names_seeds.jsonl").read_bytes())
    cache_path.write_bytes((FIXTURES / "enrich_region_names_cache.json").read_bytes())
    return seeds_path, out_path, cache_path, report_path


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def run_offline(paths, limit=None):
    seeds_path, out_path, cache_path, report_path = paths
    enrich_region_names.run(
        seeds_path,
        out_path,
        cache_path,
        report_path,
        limit=limit,
        offline=True,
    )
    return read_jsonl(out_path)


def test_japanese_vernacular_becomes_standard_ja(offline_paths):
    seed = run_offline(offline_paths)[0]
    assert seed["nameStatus"] == "standard_ja"
    assert seed["japaneseName"] == "テストムシ"
    assert seed["englishName"] == "Japanese test insect"


def test_english_vernacular_becomes_english(offline_paths):
    seed = run_offline(offline_paths)[1]
    assert seed["nameStatus"] == "english"
    assert seed["japaneseName"] == ""
    assert seed["englishName"] == "English test insect"


def test_missing_vernacular_becomes_provisional_without_transliteration(offline_paths):
    seed = run_offline(offline_paths)[2]
    assert seed["nameStatus"] == "provisional"
    assert seed["japaneseName"] == ""
    assert seed["englishName"] == ""


def test_existing_name_status_is_not_overwritten(offline_paths):
    original = read_jsonl(offline_paths[0])[3]
    enriched = run_offline(offline_paths)[3]
    assert enriched == original


def test_input_jsonl_is_byte_identical_after_run(offline_paths):
    before = offline_paths[0].read_bytes()
    run_offline(offline_paths)
    assert offline_paths[0].read_bytes() == before


def test_offline_reuses_cache_without_network_call(offline_paths, monkeypatch):
    calls = []

    def fail_if_called(self, usage_key):
        calls.append(usage_key)
        raise AssertionError("offline でネットワーク関数が呼ばれました")

    monkeypatch.setattr(
        enrich_region_names.GbifClient,
        "fetch_vernacular_payload",
        fail_if_called,
    )
    run_offline(offline_paths)
    assert calls == []


def test_output_preserves_every_input_field(offline_paths):
    original = read_jsonl(offline_paths[0])
    enriched = run_offline(offline_paths)
    for source, result in zip(original, enriched):
        assert set(result) == set(source)
        for field in set(source) - enrich_region_names.UPDATED_FIELDS:
            assert result[field] == source[field]


def test_limit_processes_only_the_first_n_rows(offline_paths):
    assert len(run_offline(offline_paths, limit=2)) == 2


def test_gbif_requests_start_at_least_two_seconds_apart(monkeypatch):
    clock = [0.0]
    starts = []

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b'{"results": []}'

    def fake_sleep(seconds):
        clock[0] += seconds

    def fake_urlopen(request, timeout):
        starts.append(clock[0])
        return FakeResponse()

    monkeypatch.setattr(enrich_region_names.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(enrich_region_names.time, "sleep", fake_sleep)
    monkeypatch.setattr(enrich_region_names.urllib.request, "urlopen", fake_urlopen)
    client = enrich_region_names.GbifClient()
    client.fetch_vernacular_payload("101")
    client.fetch_vernacular_payload("102")
    assert starts == [0.0, 2.0]
