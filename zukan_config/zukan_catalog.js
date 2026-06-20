/* quest4bugs museum-specimen zukan catalog.
   Per-species manifest of curated museum specimen photos used as zukan card
   art. Three layers per entry:
     - specimen: Darwin Core fields (institution, catalog, locality, date, ...)
     - source:   data provenance + licensing (gbif/institution URLs, licenses)
     - image:    derived files used by the renderer (display, segmented, thumbs)
   Plus top-level: creditLine, creator, sexCovered, modifications.

   Independent licenses: metadataLicense (occurrence record) and mediaLicense
   (the JPEG itself). NHMUK occurrence records are CC0 while the photos are
   CC-BY 4.0; both are recorded separately.

   ALLOWED_MEDIA_LICENSES = {"CC0-1.0", "PDM-1.0", "CC-BY-4.0"}. For CC-BY,
   creditLine + source.institutionRecordUrl + source.licenseUrl + modifications
   are required. Paths in image{} are relative to the project root. */
(function(global){
  "use strict";

  var ALLOWED_MEDIA_LICENSES = { "CC0-1.0": 1, "PDM-1.0": 1, "CC-BY-4.0": 1 };

  global.Q4B_ZUKAN_INDEX = {
    "hercules_beetle": {
      speciesId: "hercules_beetle",
      scientificName: "Dynastes hercules",
      jaName: "ヘラクレスオオカブト",
      creditLine: "Natural History Museum, London",
      creator: "The Trustees of the Natural History Museum, London",
      sexCovered: "m",
      specimen: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "BMNH(E)668002",
        occurrenceId: "8b0a8ba8-d92d-4bfc-9039-b7e4784316c0",
        persistentId: "https://data.nhm.ac.uk/object/8b0a8ba8-d92d-4bfc-9039-b7e4784316c0",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: null,
        sex: "Male",
        lifeStage: "Adult",
        recordedBy: null,
        eventDate: null,
        eventYear: null,
        country: null,
        localityVerbatim: null,
        localityNormalized: null,
        preparations: "Pinned"
      },
      source: {
        gbifOccurrenceKey: "1056811977",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/8b0a8ba8-d92d-4bfc-9039-b7e4784316c0",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/f0fba266-a4ce-4ead-b43a-31dfaf4aaae8",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      image: {
        display: "zukan_cards/processed/NHMUK014204163_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUK014204163_L1_segmented.png",
        original: "zukan_cards/original/NHMUK014204163_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUK014204163_54.webp",
        thumb108: "zukan_cards/thumb/NHMUK014204163_108.webp",
        thumb216: "zukan_cards/thumb/NHMUK014204163_216.webp"
      },
      modifications: ["cropped", "rotated", "background removed", "color adjusted"]
    }
  };

  /* Runtime sanity check. Logs warnings; does not block rendering. The build
     pipeline is expected to enforce ALLOWED_MEDIA_LICENSES at write-time. */
  if(global.console && typeof console.warn === "function"){
    for(var id in global.Q4B_ZUKAN_INDEX){
      if(!Object.prototype.hasOwnProperty.call(global.Q4B_ZUKAN_INDEX, id)) continue;
      var e = global.Q4B_ZUKAN_INDEX[id];
      var src = e.source || {};
      if(!ALLOWED_MEDIA_LICENSES[src.mediaLicense]){
        console.warn("[zukan_catalog] disallowed mediaLicense", id, src.mediaLicense);
      }
      if(src.mediaLicense === "CC-BY-4.0"){
        if(!e.creditLine || !src.institutionRecordUrl || !src.licenseUrl){
          console.warn("[zukan_catalog] CC-BY entry missing required fields", id);
        }
      }
    }
  }
})(window);
