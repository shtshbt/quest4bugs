"""Source-backed seeds for the komorebi regional reserve: insects actually
recorded in one overseas region, with names attached as best-effort enrichment.

The domestic harvester (tools/campaign3/t11_species_reserve) requires a GBIF
Japanese vernacular name because the main-game reserve publishes nothing
without a verified japaneseName. The komorebi regional reserve inverts that
rule (docs/komorebi_design.md 6.4 and 12.3): a species is stocked as soon as
its regional presence is proven, and the name is recorded as enrichment with
an explicit nameStatus so a later pass can improve the name without
re-harvesting the species.

Three GBIF surfaces are used:
  occurrence/search facets      -> species actually recorded in the region,
                                   busiest first (country= or geometry= filter)
  species/{key}                 -> accepted name, rank, class, order, family
  species/{key}/vernacularNames -> jpn / eng vernaculars for enrichment

The occurrence facet is what makes the set regional. The specimen's own
collection country is never used for membership; the facet query itself is
the distribution evidence, and its URL is stored on the record as a receipt.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from tools.campaign3.t11_species_reserve.gbif_japan_seed import (
    INSECTA, ORDER_KEYS, _is_japanese_script, verify_order_keys,
)

__all__ = ["ORDER_KEYS", "REGION_ORDER_KEYS", "GbifRegionSeedAdapter",
           "load_regions", "parse_polygon", "verify_order_keys"]

GBIF_API = "https://api.gbif.org"

# The domestic reserve deliberately harvests its ten showcase orders only, so
# Blattodea joins here rather than in the shared mapping: region flagships
# include Gromphadorhina portentosa (docs/komorebi_regions.md 7 章), and
# widening the shared ORDER_KEYS would silently change future domestic
# harvests too. 800 is verified like every other key at run start.
REGION_ORDER_KEYS = dict(ORDER_KEYS, Blattodea=800)

_REGION_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
_COUNTRY_PATTERN = re.compile(r"^[A-Z]{2}$")
_POLYGON_PATTERN = re.compile(r"^POLYGON\s*\(\(\s*(.+?)\s*\)\)$", re.DOTALL)
_REGION_KEYS = {"label", "countries", "geometry", "mustHave"}
_MUST_HAVE_KEYS = {"speciesKey", "label"}


def parse_polygon(wkt):
    """Return the WKT polygon ring as [(lon, lat), ...] or raise ValueError.

    GBIF's occurrence search rejects clockwise rings (its winding-order rule),
    and it does so at request time, which without this check would surface
    hours into a harvest rather than when the regions file is edited. The ring
    is validated here instead: single ring, closed, at least four points,
    coordinates in range, counter-clockwise by the shoelace sign.
    """
    if not isinstance(wkt, str):
        raise ValueError("geometry must be a WKT POLYGON string")
    match = _POLYGON_PATTERN.match(wkt.strip())
    if not match or "(" in match.group(1) or ")" in match.group(1):
        raise ValueError("geometry must be a single-ring POLYGON((...))")
    points = []
    for pair in match.group(1).split(","):
        parts = pair.split()
        if len(parts) != 2:
            raise ValueError(f"malformed coordinate pair: {pair.strip()!r}")
        try:
            lon, lat = float(parts[0]), float(parts[1])
        except ValueError as error:
            raise ValueError(f"non-numeric coordinate pair: {pair.strip()!r}") from error
        if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
            raise ValueError(f"coordinate out of range: {pair.strip()!r}")
        points.append((lon, lat))
    if len(points) < 4 or points[0] != points[-1]:
        raise ValueError("polygon ring must close on its first point")
    doubled_area = sum(x0 * y1 - x1 * y0
                       for (x0, y0), (x1, y1) in zip(points, points[1:]))
    if doubled_area <= 0:
        raise ValueError("polygon ring must wind counter-clockwise (GBIF rejects clockwise)")
    return points


def load_regions(path):
    """Read and validate the region definition file.

    Every region must carry a label and at least one query surface (countries
    or geometry). Validation happens up front so a typo in the file fails the
    run before any network time is spent on it.
    """
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"regions file is not valid JSON: {error}") from error
    if not isinstance(data, dict) or not data:
        raise ValueError("regions file must be a non-empty JSON object")
    for region_id, region in data.items():
        where = f"region {region_id!r}"
        if not _REGION_ID_PATTERN.match(str(region_id)):
            raise ValueError(f"{where}: id must be snake_case ascii")
        if not isinstance(region, dict):
            raise ValueError(f"{where}: definition must be an object")
        unknown = set(region) - _REGION_KEYS
        if unknown:
            raise ValueError(f"{where}: unknown keys {sorted(unknown)}")
        if not isinstance(region.get("label"), str) or not region["label"].strip():
            raise ValueError(f"{where}: label is required")
        countries = region.get("countries")
        if countries is not None and (
                not isinstance(countries, list) or not countries
                or not all(isinstance(code, str) and _COUNTRY_PATTERN.match(code)
                           for code in countries)):
            raise ValueError(f"{where}: countries must be a non-empty list of "
                             "ISO 3166-1 alpha-2 codes")
        if region.get("geometry") is not None:
            parse_polygon(region["geometry"])
        if not countries and region.get("geometry") is None:
            raise ValueError(f"{where}: needs countries or geometry")
        must_have = region.get("mustHave")
        if must_have is not None:
            if not isinstance(must_have, list) or not must_have:
                raise ValueError(f"{where}: mustHave must be a non-empty list")
            for entry in must_have:
                if not isinstance(entry, dict) or set(entry) != _MUST_HAVE_KEYS:
                    raise ValueError(f"{where}: each mustHave entry needs exactly "
                                     "speciesKey and label")
                species_key = entry["speciesKey"]
                if (isinstance(species_key, bool) or not isinstance(species_key, int)
                        or species_key < 1):
                    raise ValueError(f"{where}: mustHave speciesKey must be a "
                                     "positive integer")
                if not isinstance(entry["label"], str) or not entry["label"].strip():
                    raise ValueError(f"{where}: mustHave label is required")
    return data


class GbifRegionSeedAdapter:
    """Fetch regional insect seeds from GBIF, busiest species first.

    Transport-agnostic like the domestic adapter: it only needs
    get_json(source, endpoint, params, headers), so the offline tests can
    drive it without a network.
    """

    source = "gbif"
    # Same facet cap as the domestic adapter: GBIF serves at most 1000 facet
    # terms per request, and a request that asks for fewer terms than the
    # order actually has is silently truncated rather than flagged. Pages are
    # walked with facetOffset until the counts fall through the occurrence
    # floor or the region runs out.
    facet_page = 1000

    def __init__(self, transport, region_id, region, orders=None, min_occurrences=5):
        self.transport = transport
        self.region_id = str(region_id)
        if not isinstance(region, dict):
            raise ValueError("region must be a mapping")
        self.countries = list(region.get("countries") or [])
        self.geometry = str(region.get("geometry") or "")
        if self.geometry:
            parse_polygon(self.geometry)
        if not self.countries and not self.geometry:
            raise ValueError("region needs countries or geometry")
        self.must_have = list(region.get("mustHave") or [])
        # None means "use the default orders". An explicitly empty mapping is a
        # caller mistake and must not silently widen the run to every order.
        self.orders = dict(REGION_ORDER_KEYS if orders is None else orders)
        if not self.orders:
            raise ValueError("at least one order is required")
        if not isinstance(min_occurrences, int) or min_occurrences < 1:
            raise ValueError("min_occurrences must be a positive integer")
        self.min_occurrences = min_occurrences

    def region_filters(self):
        """One occurrence-search filter per query surface.

        GBIF's country parameter takes one code per request, so a
        multi-country region is asked one country at a time and the counts
        are summed. An island region has no usable country code at all
        (Borneo spans three) and queries by WKT geometry instead.
        """
        filters = [{"country": code} for code in self.countries]
        if self.geometry:
            filters.append({"geometry": self.geometry})
        return filters

    def region_species(self, wanted):
        """[(species_key, occurrence_count, receipts)] interleaved across orders.

        Within an order, species come busiest first (multi-surface counts are
        summed before ranking). Orders are interleaved so a bounded run stays
        taxonomically broad rather than exhausting one order first.
        """
        if not isinstance(wanted, int) or wanted < 1:
            raise ValueError("wanted must be a positive integer")
        per_order = max(1, -(-wanted // len(self.orders)))
        by_order = []
        for _, taxon_key in sorted(self.orders.items()):
            merged = self._order_species_counts(taxon_key, per_order)
            ranked = sorted(merged.items(), key=lambda item: (-item[1]["count"], item[0]))
            by_order.append([(key, entry["count"], entry["receipts"])
                             for key, entry in ranked])

        seen, ordered = set(), []
        for index in range(max((len(items) for items in by_order), default=0)):
            for items in by_order:
                if index < len(items) and items[index][0] not in seen:
                    seen.add(items[index][0])
                    ordered.append(items[index])
        return ordered

    def _order_species_counts(self, taxon_key, wanted):
        """{species_key: {"count", "receipts"}} for one order across surfaces.

        GBIF returns facet counts in descending order, so once a term falls
        below the occurrence floor every later term in that query does too and
        the surface is finished. A multi-surface region sums the per-surface
        counts, so a merged count can exceed any single surface's. Each
        surface contributes at most `wanted` species so a bounded run stays
        bounded in requests too.
        """
        merged = {}
        for region_filter in self.region_filters():
            offset, surface_seen = 0, 0
            while surface_seen < wanted:
                params = dict(region_filter, taxonKey=taxon_key, rank="SPECIES",
                              facet="speciesKey", facetLimit=self.facet_page,
                              facetOffset=offset, limit=0)
                payload = self.transport.get_json("gbif", "/v1/occurrence/search", params, {})
                facets = payload.get("facets") if isinstance(payload, dict) else None
                counts = (facets[0].get("counts") if facets else []) or []
                if not counts:
                    break
                receipt = f"{GBIF_API}/v1/occurrence/search?{urlencode(params)}"
                floored = False
                for item in counts:
                    if not str(item.get("name", "")).isdigit():
                        continue
                    count = int(item.get("count", 0))
                    if count < self.min_occurrences:
                        floored = True
                        break
                    entry = merged.setdefault(int(item["name"]), {"count": 0, "receipts": []})
                    entry["count"] += count
                    entry["receipts"].append(receipt)
                    surface_seen += 1
                if floored or len(counts) < self.facet_page:
                    break
                offset += self.facet_page
        return merged

    def must_have_presence(self, species_key):
        """(regional occurrence count, receipts) for one named flagship.

        A must-have species is stocked on the same evidence rule as everything
        else: the region's own occurrence query is the membership proof. Only
        the min_occurrences floor is waived, because flagships are named
        precisely when their fame outruns their record count (the frequency
        walk already finds the busy ones). Zero records is therefore not a
        verdict but a wait: the caller skips without caching a reject, so a
        later run retries after the data improves.
        """
        total, receipts = 0, []
        for region_filter in self.region_filters():
            params = dict(region_filter, taxonKey=int(species_key), limit=0)
            payload = self.transport.get_json("gbif", "/v1/occurrence/search", params, {})
            count = payload.get("count") if isinstance(payload, dict) else 0
            if isinstance(count, int) and count > 0:
                total += count
                receipts.append(f"{GBIF_API}/v1/occurrence/search?{urlencode(params)}")
        return total, receipts

    def seed_for(self, species_key, occurrence_count, receipts, must_have=False):
        """Build one region seed, or explain its rejection.

        Returns (seed, None) or (None, reason). Only two verdicts reject a
        species for good: a non-species rank and a non-insect class. A missing
        name is enrichment state, never a rejection (docs/komorebi_design.md
        6.4), and an unreadable response raises instead, so a transient
        failure is never cached as a permanent verdict.

        Unlike the domestic adapter, taxonomy is read before vernaculars:
        every accepted species becomes a record here regardless of name, so
        the taxonomy call is never wasted, while a rejected species should not
        pay for a vernacular lookup it cannot use.
        """
        taxon = self.transport.get_json("gbif", f"/v1/species/{species_key}", {}, {})
        if not isinstance(taxon, dict) or not taxon:
            raise ValueError(f"unreadable taxonomy response for species {species_key}")
        rank = str(taxon.get("rank") or taxon.get("taxonRank") or "").upper()
        if rank != "SPECIES":
            return None, f"non_species_rank:{rank or 'unknown'}"
        if taxon.get("class") != INSECTA:
            return None, f"non_insecta:{taxon.get('class') or 'unknown'}"
        name = taxon.get("scientificName") or taxon.get("canonicalName") or taxon.get("species")
        order = taxon.get("order")
        if not name or not order:
            raise ValueError(f"species {species_key} response lacks a name or order")

        japanese, english = self._vernaculars(species_key)
        source_url = f"https://www.gbif.org/species/{species_key}"
        if japanese:
            status, name_source = "standard", f"{source_url}#vernacular-jpn"
        elif english:
            status, name_source = "english_common_candidate", f"{source_url}#vernacular-eng"
        else:
            status, name_source = "pending", ""
        record = {
            "seedId": f"gbif_{species_key}",
            "regionId": self.region_id,
            "scientificName": str(name),
            "taxonRank": "species",
            "synonyms": [],
            "japaneseName": japanese,
            "englishName": english,
            "nameStatus": status,
            "nameSource": name_source,
            "order": str(order),
            "family": str(taxon.get("family") or ""),
            "occurrenceCount": int(occurrence_count),
            "facetReceipts": list(receipts),
            "taxonomySource": source_url,
            "sourceReceipt": source_url,
            "checkedAt": datetime.now(timezone.utc).isoformat(),
            "taxonomyResponse": taxon,
        }
        # Absent on ordinary seeds so the historic records keep their exact
        # shape; downstream reads a missing flag as False either way.
        if must_have:
            record["mustHave"] = True
        return record, None

    def _vernaculars(self, species_key):
        """Return (japanese, english) vernacular names; either may be empty.

        The Japanese name must be in Japanese script; a romaji form filed
        under jpn is not a standard name (the domestic harvester's rule).
        English accepts both ISO 639-3 'eng' and the two-letter 'en' some
        datasets publish. A malformed response reads as no names, which is
        safe here: nameStatus stays pending and a later enrichment pass can
        retry without losing the species.
        """
        payload = self.transport.get_json(
            "gbif", f"/v1/species/{species_key}/vernacularNames", {"limit": 100}, {})
        results = payload.get("results") if isinstance(payload, dict) else None
        japanese = english = ""
        if not isinstance(results, list):
            return japanese, english
        for item in results:
            if not isinstance(item, dict):
                continue
            value = str(item.get("vernacularName") or "").strip()
            if not value:
                continue
            language = item.get("language")
            if not japanese and language == "jpn" and _is_japanese_script(value):
                japanese = value
            elif not english and language in ("eng", "en"):
                english = value
        return japanese, english
