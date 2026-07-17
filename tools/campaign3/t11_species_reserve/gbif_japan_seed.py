"""Source-backed seeds for the species reserve: insects actually recorded in Japan
that carry a Japanese vernacular name in GBIF.

Every field is read from GBIF. Nothing is invented here: a species without a
GBIF Japanese vernacular name is skipped rather than given a name, because the
reserve requires a verified japaneseName with a source.

Two GBIF surfaces are used:
  occurrence/search facets  ->  species actually recorded in Japan, busiest first
  species/{key}             ->  accepted name, rank, order, family
  species/{key}/vernacularNames -> the Japanese name and its source

The occurrence facet is what makes the set Japanese. Filtering the global
species index by country does not work: it returns taxa with no Japanese
presence.
"""

from datetime import datetime, timezone

# GBIF backbone taxonKeys for the insect orders the game draws from.
ORDER_KEYS = {
    "Coleoptera": 1470,
    "Lepidoptera": 797,
    "Hymenoptera": 1457,
    "Hemiptera": 809,
    "Odonata": 789,
    "Orthoptera": 1458,
    "Diptera": 811,
    "Mantodea": 1494,
    "Phasmatodea": 1459,
    "Trichoptera": 1003,
}
JAPAN = "JP"


class GbifJapanSeedAdapter:
    """Fetch live seeds for insects recorded in Japan that have a Japanese name.

    Transport-agnostic: it only needs get_json(source, endpoint, params, headers),
    so the offline tests can drive it without a network.
    """

    source = "gbif"
    facet_page = 300

    def __init__(self, transport, orders=None, min_occurrences=5):
        self.transport = transport
        # None means "use the default orders". An explicitly empty mapping is a
        # caller mistake and must not silently widen the run to every order.
        self.orders = dict(ORDER_KEYS if orders is None else orders)
        if not self.orders:
            raise ValueError("at least one order is required")
        if not isinstance(min_occurrences, int) or min_occurrences < 1:
            raise ValueError("min_occurrences must be a positive integer")
        self.min_occurrences = min_occurrences

    def fetch(self, limit, offset=0):
        if not isinstance(limit, int) or limit < 1 or not isinstance(offset, int) or offset < 0:
            raise ValueError("limit must be positive and offset must be non-negative")
        seeds = []
        for species_key in self._japanese_species_keys(limit + offset):
            if len(seeds) >= limit + offset:
                break
            seed = self._seed_for(species_key)
            if seed is not None:
                seeds.append(seed)
        return seeds[offset:offset + limit]

    def _japanese_species_keys(self, wanted):
        """Species keys recorded in Japan, per order, busiest first.

        Orders are interleaved so a bounded run stays taxonomically broad rather
        than exhausting one order first.
        """
        per_order = max(1, -(-wanted // len(self.orders)))
        by_order = []
        for name, taxon_key in sorted(self.orders.items()):
            payload = self.transport.get_json("gbif", "/v1/occurrence/search", {
                "country": JAPAN, "taxonKey": taxon_key, "rank": "SPECIES",
                "facet": "speciesKey", "facetLimit": min(self.facet_page, per_order * 3),
                "limit": 0,
            }, {})
            facets = payload.get("facets") if isinstance(payload, dict) else None
            counts = (facets[0].get("counts") if facets else []) or []
            keys = [int(item["name"]) for item in counts
                    if str(item.get("name", "")).isdigit()
                    and int(item.get("count", 0)) >= self.min_occurrences]
            by_order.append(keys)

        seen = set()
        ordered = []
        for index in range(max((len(keys) for keys in by_order), default=0)):
            for keys in by_order:
                if index < len(keys) and keys[index] not in seen:
                    seen.add(keys[index])
                    ordered.append(keys[index])
        return ordered

    def _seed_for(self, species_key):
        taxon = self.transport.get_json("gbif", f"/v1/species/{species_key}", {}, {})
        if not isinstance(taxon, dict) or str(taxon.get("rank", "")).upper() != "SPECIES":
            return None
        name = taxon.get("scientificName") or taxon.get("canonicalName")
        order = taxon.get("order")
        if not name or not order:
            return None

        japanese_name = self._japanese_name(species_key)
        if not japanese_name:
            return None

        source_url = f"https://www.gbif.org/species/{species_key}"
        return {
            "seedId": f"gbif_{species_key}",
            "scientificName": str(name),
            "taxonRank": "species",
            "synonyms": [],
            "japaneseName": japanese_name,
            "japaneseNameSource": f"{source_url}#vernacular-jpn",
            "order": str(order),
            "family": str(taxon.get("family") or ""),
            "taxonomySource": source_url,
            "sourceReceipt": source_url,
            "subjectProposal": "",
            "checkedAt": datetime.now(timezone.utc).isoformat(),
            "taxonomyResponse": taxon,
        }

    def _japanese_name(self, species_key):
        """Return the GBIF Japanese vernacular name, or None.

        Latin transliterations that GBIF also files under jpn (for example
        Senchi-kogane beside センチコガネ) are skipped: the game needs the
        Japanese script form.
        """
        payload = self.transport.get_json(
            "gbif", f"/v1/species/{species_key}/vernacularNames", {"limit": 100}, {})
        results = payload.get("results") if isinstance(payload, dict) else None
        if not isinstance(results, list):
            return None
        for item in results:
            if not isinstance(item, dict) or item.get("language") != "jpn":
                continue
            value = str(item.get("vernacularName") or "").strip()
            if value and _is_japanese_script(value):
                return value
        return None


def _is_japanese_script(value):
    """True when the text contains kana or kanji, so a romaji form is rejected."""
    return any(
        "぀" <= ch <= "ヿ" or "一" <= ch <= "鿿"
        for ch in value
    )
