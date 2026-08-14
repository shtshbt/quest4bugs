#!/usr/bin/env python3
"""地域 seed の未確定名称を GBIF vernacular で補完する。"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


GBIF_API = "https://api.gbif.org/v1"
USER_AGENT = "quest4bugs-nametool/0.1"
REQUEST_INTERVAL_SECONDS = 2.0
MAX_RETRIES = 3
UPDATED_FIELDS = {"japaneseName", "englishName", "nameStatus", "nameSource"}
JAPANESE_PATTERN = re.compile(r"[\u3040-\u30ff\u3400-\u9fff]")


class EnrichmentError(Exception):
    """利用者に日本語で示せる enrichment エラー。"""


class NetworkError(EnrichmentError):
    """1 件を pending のまま残して続行できる通信エラー。"""


class JapaneseArgumentParser(argparse.ArgumentParser):
    """CLI 境界の失敗を日本語の見出しで表示する。"""

    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(2, f"{self.prog}: 引数エラー: {message}\n")


class GbifClient:
    """GBIF の共有上限を守りながら vernacular 応答を取得する。"""

    def __init__(self):
        self.last_request_started = None

    def _wait_for_rate_limit(self):
        # 応答時間ではなく開始時刻同士を離し、速い失敗や再試行でも上限を破らない。
        if self.last_request_started is not None:
            elapsed = time.monotonic() - self.last_request_started
            if elapsed < REQUEST_INTERVAL_SECONDS:
                time.sleep(REQUEST_INTERVAL_SECONDS - elapsed)
        self.last_request_started = time.monotonic()

    def fetch_vernacular_payload(self, usage_key):
        url = vernacular_url(usage_key)
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        for attempt in range(MAX_RETRIES + 1):
            self._wait_for_rate_limit()
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict):
                    raise NetworkError(f"GBIF 応答が JSON object ではありません: {url}")
                return payload
            except urllib.error.HTTPError as error:
                retryable = error.code == 429 or 500 <= error.code < 600
                if not retryable or attempt == MAX_RETRIES:
                    raise NetworkError(
                        f"GBIF 取得に失敗しました (HTTP {error.code}): {url}"
                    ) from error
                delay = 2 ** attempt
                print(
                    f"GBIF が HTTP {error.code} を返しました。{delay} 秒後に再試行します "
                    f"({attempt + 1}/{MAX_RETRIES}): {url}",
                    file=sys.stderr,
                )
                time.sleep(delay)
            except (urllib.error.URLError, TimeoutError, UnicodeDecodeError,
                    json.JSONDecodeError) as error:
                raise NetworkError(f"GBIF 応答を取得できませんでした: {url}: {error}") from error
        raise NetworkError(f"GBIF 取得に失敗しました: {url}")


def positive_int(value):
    """--limit を正の整数に限定する。"""
    try:
        number = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("正の整数を指定してください") from error
    if number < 1:
        raise argparse.ArgumentTypeError("1 以上の整数を指定してください")
    return number


def vernacular_url(usage_key):
    """nameSource と実リクエストで共有する GBIF URL を返す。"""
    return f"{GBIF_API}/species/{usage_key}/vernacularNames"


def usage_key_for(seed):
    """taxonomyResponse を優先し、最後に seedId から usageKey を得る。"""
    taxonomy = seed.get("taxonomyResponse")
    if isinstance(taxonomy, dict):
        for field in ("usageKey", "key", "speciesKey"):
            value = taxonomy.get(field)
            if re.fullmatch(r"[1-9]\d*", str(value or "")):
                return str(value)
    match = re.fullmatch(r"gbif_([1-9]\d*)", str(seed.get("seedId") or ""))
    return match.group(1) if match else None


def select_names(payload):
    """GBIF 応答から最初の日本語名と英語名を選ぶ。"""
    results = payload.get("results") if isinstance(payload, dict) else None
    japanese = ""
    english = ""
    if not isinstance(results, list):
        return japanese, english
    for item in results:
        if not isinstance(item, dict):
            continue
        name = str(item.get("vernacularName") or "").strip()
        language = str(item.get("language") or "").lower()
        if not japanese and language == "jpn" and JAPANESE_PATTERN.search(name):
            japanese = name
        elif not english and language == "eng" and name:
            english = name
    return japanese, english


def load_seeds(path, limit=None):
    """JSONL を読み、行番号を含む日本語エラーで不正入力を止める。"""
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise EnrichmentError(f"入力 JSONL を読めません: {path}: {error}") from error
    seeds = []
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            raise EnrichmentError(f"入力 JSONL の {line_number} 行目が空です")
        try:
            seed = json.loads(line)
        except json.JSONDecodeError as error:
            raise EnrichmentError(
                f"入力 JSONL の {line_number} 行目が不正な JSON です: {error}"
            ) from error
        if not isinstance(seed, dict):
            raise EnrichmentError(
                f"入力 JSONL の {line_number} 行目が JSON object ではありません"
            )
        seeds.append(seed)
        if limit is not None and len(seeds) >= limit:
            break
    return seeds


def load_cache(path):
    """存在しない cache は空として扱い、既存 cache の破損は黙殺しない。"""
    cache_path = Path(path)
    if not cache_path.exists():
        return {}
    try:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise EnrichmentError(f"cache を読めません: {path}: {error}") from error
    if not isinstance(cache, dict):
        raise EnrichmentError(f"cache の最上位は JSON object である必要があります: {path}")
    return cache


def save_cache(cache, path):
    """中断時にも再利用できるよう、成功した応答ごとに cache を安全に置換する。"""
    cache_path = Path(path)
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = cache_path.with_name(f"{cache_path.name}.tmp")
        temporary_path.write_text(
            json.dumps(cache, ensure_ascii=False, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        temporary_path.replace(cache_path)
    except OSError as error:
        raise EnrichmentError(f"cache を保存できません: {path}: {error}") from error


def enrich_seeds(seeds, cache, cache_path, offline=False, client=None):
    """pending の seed だけを補完し、pending 理由を seedId ごとに返す。"""
    client = client or GbifClient()
    enriched = []
    pending_reasons = {}
    total = len(seeds)
    for index, original in enumerate(seeds, start=1):
        seed = dict(original)
        if seed.get("nameStatus") != "pending":
            enriched.append(seed)
            continue

        usage_key = usage_key_for(seed)
        if usage_key is None:
            pending_reasons[str(seed.get("seedId") or index)] = "network"
            print(
                f"usageKey を特定できないため pending のまま残します: "
                f"{seed.get('seedId') or index}",
                file=sys.stderr,
            )
            enriched.append(seed)
            continue

        source_url = vernacular_url(usage_key)
        payload = cache.get(usage_key)
        if payload is None:
            if offline:
                pending_reasons[str(seed.get("seedId") or usage_key)] = "network"
                print(
                    f"offline cache に応答がないため pending のまま残します: {usage_key}",
                    file=sys.stderr,
                )
                enriched.append(seed)
                continue
            try:
                payload = client.fetch_vernacular_payload(usage_key)
            except NetworkError as error:
                pending_reasons[str(seed.get("seedId") or usage_key)] = "network"
                print(str(error), file=sys.stderr)
                enriched.append(seed)
                continue
            cache[usage_key] = payload
            save_cache(cache, cache_path)

        japanese, english = select_names(payload)
        if japanese:
            updates = {
                "japaneseName": japanese,
                "englishName": english,
                "nameStatus": "standard_ja",
                "nameSource": source_url,
            }
        elif english:
            updates = {
                "japaneseName": "",
                "englishName": english,
                "nameStatus": "english",
                "nameSource": source_url,
            }
        else:
            # 属和名の根拠が入力にも GBIF 応答にもないため、転写名を捏造せず空欄で示す。
            updates = {
                "japaneseName": "",
                "englishName": "",
                "nameStatus": "provisional",
                "nameSource": source_url,
            }
        seed.update(updates)
        enriched.append(seed)
        print(
            f"名称処理 {index}/{total}: {seed.get('scientificName') or usage_key} "
            f"[{seed['nameStatus']}]",
            file=sys.stderr,
        )
    return enriched, pending_reasons


def write_jsonl(seeds, path):
    """入力とは別の出力先へ全フィールドを保持した JSONL を書く。"""
    output_path = Path(path)
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        text = "".join(
            json.dumps(seed, ensure_ascii=False, sort_keys=True) + "\n"
            for seed in seeds
        )
        output_path.write_text(text, encoding="utf-8")
    except OSError as error:
        raise EnrichmentError(f"出力 JSONL を保存できません: {path}: {error}") from error


def report_status(status):
    """既存の確定 status を新しい報告階層へ読み替える。"""
    return {
        "standard": "standard_ja",
        "english_common_candidate": "english",
    }.get(status, status)


def markdown_cell(value):
    """名称中の記号で Markdown 表が壊れないようにする。"""
    return str(value or "").replace("|", "\\|").replace("\n", " ")


def write_report(seeds, pending_reasons, path):
    """層別件数・標準和名・pending 理由を Markdown にまとめる。"""
    statuses = [report_status(seed.get("nameStatus")) for seed in seeds]
    counts = {
        status: statuses.count(status)
        for status in ("standard_ja", "english", "provisional", "pending")
    }
    standard_rows = [
        seed for seed in seeds if report_status(seed.get("nameStatus")) == "standard_ja"
    ]
    network_failures = sum(reason == "network" for reason in pending_reasons.values())
    vernacular_missing = sum(
        reason == "vernacular_none" for reason in pending_reasons.values()
    )
    rate = (100.0 * counts["standard_ja"] / len(seeds)) if seeds else 0.0
    lines = [
        "# 地域 seed 名称 enrichment 報告",
        "",
        f"- 総数: {len(seeds)}",
        f"- standard_ja: {counts['standard_ja']}",
        f"- english: {counts['english']}",
        f"- provisional: {counts['provisional']}",
        f"- pending: {counts['pending']}",
        f"- 標準和名取得率: {rate:.1f}%",
        "",
        "## standard_ja 一覧",
        "",
        "| 和名 | 学名 |",
        "|---|---|",
    ]
    lines.extend(
        f"| {markdown_cell(seed.get('japaneseName'))} | "
        f"{markdown_cell(seed.get('scientificName'))} |"
        for seed in standard_rows
    )
    lines.extend([
        "",
        "## pending の理由",
        "",
        f"- pending のまま残った件数: {counts['pending']}",
        f"- network 失敗: {network_failures}",
        f"- vernacular 無し: {vernacular_missing}",
        "",
    ])
    report_path = Path(path)
    try:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text("\n".join(lines), encoding="utf-8")
    except OSError as error:
        raise EnrichmentError(f"報告を保存できません: {path}: {error}") from error


def run(seeds_path, out_path, cache_path, report_path, limit=None, offline=False):
    """1 回の enrichment を実行し、処理件数を返す。"""
    input_path = Path(seeds_path)
    output_path = Path(out_path)
    if input_path.resolve() == output_path.resolve():
        raise EnrichmentError("入力 JSONL と出力 JSONL に同じパスは指定できません")
    seeds = load_seeds(input_path, limit=limit)
    cache = load_cache(cache_path)
    enriched, pending_reasons = enrich_seeds(
        seeds, cache, cache_path, offline=offline
    )
    write_jsonl(enriched, output_path)
    write_report(enriched, pending_reasons, report_path)
    return len(enriched)


def build_parser():
    """CLI parser を構築する。"""
    parser = JapaneseArgumentParser(description="地域 seed の名称を GBIF で補完します")
    parser.add_argument("--seeds", required=True, help="読み取り専用の入力 JSONL")
    parser.add_argument("--out", required=True, help="enrichment 後の出力 JSONL")
    parser.add_argument("--cache", required=True, help="GBIF 応答 cache JSON")
    parser.add_argument("--report", required=True, help="Markdown 報告の出力先")
    parser.add_argument("--limit", type=positive_int, help="先頭 N 件だけ処理")
    parser.add_argument(
        "--offline", action="store_true", help="cache のみを使いネットワークを禁止"
    )
    return parser


def main(argv=None):
    """CLI entrypoint。"""
    args = build_parser().parse_args(argv)
    try:
        count = run(
            args.seeds,
            args.out,
            args.cache,
            args.report,
            limit=args.limit,
            offline=args.offline,
        )
    except EnrichmentError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1
    print(f"名称 enrichment が完了しました: {count} 件", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
