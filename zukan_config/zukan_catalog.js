/* quest4bugs museum-specimen zukan catalog.
   Per-species manifest of curated museum specimen photos used as zukan card
   art. Three layers per entry:
     - specimen: Darwin Core fields (institution, catalog, locality, date, ...)
     - source:   data provenance + licensing (gbif/institution URLs, licenses)
     - image:    derived files used by the renderer (display, segmented, thumbs)
   Plus top-level: creditLine, creator, sexCovered, modifications.

   Sex-dimorphic species can carry a second pair (specimenFemale + sourceFemale
   + image_female) so the female phenotype renders from its own occurrence
   record. zukan_render.js picks image_female when sex='f' and entry covers it.

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
        version: "1",
        display: "zukan_cards/processed/NHMUK014204163_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUK014204163_L1_segmented.png",
        original: "zukan_cards/original/NHMUK014204163_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUK014204163_54.webp",
        thumb108: "zukan_cards/thumb/NHMUK014204163_108.webp",
        thumb216: "zukan_cards/thumb/NHMUK014204163_216.webp"
      },
      modifications: ["cropped", "rotated", "background removed", "color adjusted"]
    },

    "queen_alexandras_birdwing": {
      speciesId: "queen_alexandras_birdwing",
      scientificName: "Ornithoptera alexandrae",
      jaName: "アレクサンドラトリバネアゲハ",
      creditLine: "Natural History Museum, London",
      creator: "The Trustees of the Natural History Museum, London",
      sexCovered: "both",
      specimen: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "BMNH(E)102811",
        occurrenceId: "161f225c-52f2-4675-9c64-f75a99c1bf74",
        persistentId: "https://data.nhm.ac.uk/object/161f225c-52f2-4675-9c64-f75a99c1bf74",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: null,
        sex: "Male",
        lifeStage: "Adult",
        recordedBy: "A.S. Meek",
        eventDate: "1907",
        eventYear: 1907,
        country: "Papua New Guinea",
        localityVerbatim: "Kumusi R.",
        localityNormalized: "Kumusi River, Papua New Guinea",
        preparations: null
      },
      specimenFemale: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "BMNH(E)102817",
        occurrenceId: "1e5b43ac-971e-4943-8ef7-6a4bc6c11751",
        persistentId: "https://data.nhm.ac.uk/object/1e5b43ac-971e-4943-8ef7-6a4bc6c11751",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: null,
        sex: "Female",
        lifeStage: "Adult",
        recordedBy: "A.S. Meek",
        eventDate: "1907",
        eventYear: 1907,
        country: "Papua New Guinea",
        localityVerbatim: "Kumusi R.",
        localityNormalized: "Kumusi River, Papua New Guinea",
        preparations: null
      },
      source: {
        gbifOccurrenceKey: "2446090903",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/161f225c-52f2-4675-9c64-f75a99c1bf74",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/63bf72b5-233a-4dce-9a3b-d63f55fd0ba2",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      sourceFemale: {
        gbifOccurrenceKey: "2446090909",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/1e5b43ac-971e-4943-8ef7-6a4bc6c11751",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/eca2a1e9-bc00-4f8e-b103-5cf846306839",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      image: {
        version: "4",
        display: "zukan_cards/processed/NHMUK013602425_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUK013602425_L1_segmented.png",
        original: "zukan_cards/original/NHMUK013602425_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUK013602425_54.webp",
        thumb108: "zukan_cards/thumb/NHMUK013602425_108.webp",
        thumb216: "zukan_cards/thumb/NHMUK013602425_216.webp"
      },
      image_female: {
        version: "1",
        display: "zukan_cards/processed/NHMUK013602430_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUK013602430_L1_segmented.png",
        original: "zukan_cards/original/NHMUK013602430_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUK013602430_54.webp",
        thumb108: "zukan_cards/thumb/NHMUK013602430_108.webp",
        thumb216: "zukan_cards/thumb/NHMUK013602430_216.webp"
      },
      modifications: ["cropped", "background removed", "color adjusted"]
    },

    "bhutan_glory": {
      speciesId: "bhutan_glory",
      scientificName: "Bhutanitis lidderdalii",
      jaName: "ブータンシボリアゲハ",
      creditLine: "Naturalis Biodiversity Center",
      creator: "Naturalis Biodiversity Center",
      sexCovered: "f",
      specimen: {
        institution: "Naturalis Biodiversity Center",
        institutionCode: "RMNH",
        collectionCode: "Lepidoptera",
        catalogNumber: "RMNH.INS.986686",
        occurrenceId: "https://data.biodiversitydata.nl/naturalis/specimen/RMNH.INS.986686",
        persistentId: "https://data.biodiversitydata.nl/naturalis/specimen/RMNH.INS.986686",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: null,
        sex: "Female",
        lifeStage: null,
        recordedBy: null,
        eventDate: "1979-09-03",
        eventYear: 1979,
        country: "Thailand",
        localityVerbatim: "Chiang Dao",
        localityNormalized: "Chiang Dao, Thailand",
        decimalLatitude: 19.367814,
        decimalLongitude: 98.964902,
        preparations: "WholeOrganism (air dried)"
      },
      source: {
        gbifOccurrenceKey: "3497102314",
        institutionRecordUrl: "https://data.biodiversitydata.nl/naturalis/specimen/RMNH.INS.986686",
        sourceMediaUrl: "https://medialib.naturalis.nl/file/id/RMNH.INS.986686_1/format/large",
        datasetKey: "f3130a8a-4508-42b4-9737-fbda77748438",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC0-1.0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
      },
      image: {
        version: "1",
        display: "zukan_cards/processed/RMNH_INS_986686_L2_grade.webp",
        segmented: "zukan_cards/processed/RMNH_INS_986686_L1_segmented.png",
        original: "zukan_cards/original/RMNH_INS_986686_original.jpg",
        thumb54: "zukan_cards/thumb/RMNH_INS_986686_54.webp",
        thumb108: "zukan_cards/thumb/RMNH_INS_986686_108.webp",
        thumb216: "zukan_cards/thumb/RMNH_INS_986686_216.webp"
      },
      modifications: ["cropped", "rotated", "background removed", "color adjusted"]
    },

    "rainbow_stag_beetle": {
      speciesId: "rainbow_stag_beetle",
      scientificName: "Phalacrognathus muelleri",
      jaName: "ニジイロクワガタ",
      creditLine: "Australian Museum",
      creator: "Joycelyn Goh",
      sexCovered: "m",
      specimen: {
        institution: "Australian Museum",
        institutionCode: "AM",
        collectionCode: "Entomology",
        catalogNumber: "K.556427",
        occurrenceId: "b8443a59-e4ef-44e8-ab9e-1d60de530136",
        persistentId: "https://biocache.ala.org.au/occurrences/b8443a59-e4ef-44e8-ab9e-1d60de530136",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: null,
        sex: null,
        lifeStage: null,
        recordedBy: "D.C.F. Rentz",
        eventDate: "2019-03-01/2019-03-15",
        eventYear: 2019,
        country: "Australia",
        localityVerbatim: "19 Butler Drive, Top of the Range, Kuranda (formerly 11 Victor Place)",
        localityNormalized: "Kuranda, Queensland, Australia",
        decimalLatitude: -16.805277,
        decimalLongitude: 145.63861,
        preparations: null
      },
      source: {
        gbifOccurrenceKey: "2596644573",
        institutionRecordUrl: "https://biocache.ala.org.au/occurrences/b8443a59-e4ef-44e8-ab9e-1d60de530136",
        sourceMediaUrl: "https://images.ala.org.au/image/proxyImageThumbnailLarge?imageId=05ccfaeb-c9b8-4e5d-b8be-76910426410a",
        datasetKey: "dce8feb0-6c89-11de-8225-b8a03c50a862",
        metadataLicense: "CC-BY-4.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      image: {
        version: "2",
        display: "zukan_cards/processed/AMK556427_L2_grade.webp",
        segmented: "zukan_cards/processed/AMK556427_L1_segmented.png",
        original: "zukan_cards/original/AMK556427_original.jpg",
        thumb54: "zukan_cards/thumb/AMK556427_54.webp",
        thumb108: "zukan_cards/thumb/AMK556427_108.webp",
        thumb216: "zukan_cards/thumb/AMK556427_216.webp"
      },
      modifications: ["cropped", "rotated", "background removed", "color adjusted"]
    },

    "goliath_beetle": {
      speciesId: "goliath_beetle",
      scientificName: "Goliathus goliatus",
      jaName: "ゴライアスオオツノハナムグリ",
      creditLine: "National Museum of Natural History, Luxembourg",
      creator: "National Museum of Natural History, Luxembourg",
      sexCovered: "m",
      specimen: {
        institution: "National Museum of Natural History, Luxembourg",
        institutionCode: "MNHNL",
        collectionCode: "COL-W43",
        catalogNumber: "MNHNL89483",
        occurrenceId: "DSS0043900002TFG::DSS00439000020AS::",
        persistentId: "https://archimg.mnhn.lu/Collections/Invertebrate-zoology/Arthropoda-specimens/MNHNL89483.jpg",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: null,
        sex: null,
        lifeStage: null,
        recordedBy: null,
        eventDate: "1899-12-30",
        eventYear: 1899,
        country: null,
        localityVerbatim: null,
        localityNormalized: "Africa",
        preparations: "pinned specimen"
      },
      source: {
        gbifOccurrenceKey: "6362379554",
        institutionRecordUrl: "https://archimg.mnhn.lu/Collections/Invertebrate-zoology/Arthropoda-specimens/MNHNL89483.jpg",
        sourceMediaUrl: "https://archimg.mnhn.lu/Collections/Invertebrate-zoology/Arthropoda-specimens/MNHNL89483-2.jpg",
        datasetKey: "962f59bc-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC0-1.0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
      },
      image: {
        version: "2",
        display: "zukan_cards/processed/MNHNLMNHNL89483_L2_grade.webp",
        segmented: "zukan_cards/processed/MNHNLMNHNL89483_L1_segmented.png",
        original: "zukan_cards/original/MNHNLMNHNL89483_original.jpg",
        thumb54: "zukan_cards/thumb/MNHNLMNHNL89483_54.webp",
        thumb108: "zukan_cards/thumb/MNHNLMNHNL89483_108.webp",
        thumb216: "zukan_cards/thumb/MNHNLMNHNL89483_216.webp"
      },
      modifications: ["cropped", "rotated", "background removed", "color adjusted"]
    },

    "morpho_butterfly": {
      speciesId: "morpho_butterfly",
      scientificName: "Morpho menelaus",
      jaName: "モルフォチョウ",
      creditLine: "Natural History Museum, London",
      creator: "The Trustees of the Natural History Museum, London",
      sexCovered: "m",
      specimen: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "808215",
        occurrenceId: "6f42bc62-2bc4-4403-b87f-1a59e162a1a7",
        persistentId: "https://data.nhm.ac.uk/object/6f42bc62-2bc4-4403-b87f-1a59e162a1a7",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: "Paratype",
        sex: null,
        lifeStage: null,
        recordedBy: null,
        eventDate: null,
        eventYear: null,
        country: "Venezuela",
        localityVerbatim: null,
        localityNormalized: "Venezuela",
        preparations: null
      },
      source: {
        gbifOccurrenceKey: "3457661662",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/6f42bc62-2bc4-4403-b87f-1a59e162a1a7",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/a6958f61-4175-45cf-94e6-9c4f03302322",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      image: {
        version: "1",
        display: "zukan_cards/processed/NHMUK808215_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUK808215_L1_segmented.png",
        original: "zukan_cards/original/NHMUK808215_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUK808215_54.webp",
        thumb108: "zukan_cards/thumb/NHMUK808215_108.webp",
        thumb216: "zukan_cards/thumb/NHMUK808215_216.webp"
      },
      modifications: ["cropped", "background removed", "color adjusted"]
    },

    "apollo": {
      speciesId: "apollo",
      scientificName: "Parnassius apollo",
      jaName: "アポロチョウ",
      creditLine: "Natural History Museum, London",
      creator: "The Trustees of the Natural History Museum, London",
      sexCovered: "m",
      specimen: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "NHMUK014168924",
        occurrenceId: "b8debc91-d980-4d64-957c-cf63533187fb",
        persistentId: "https://data.nhm.ac.uk/object/b8debc91-d980-4d64-957c-cf63533187fb",
        basisOfRecord: "PreservedSpecimen",
        typeStatus: "Syntype",
        sex: null,
        lifeStage: null,
        recordedBy: null,
        eventDate: null,
        eventYear: null,
        country: null,
        localityVerbatim: null,
        localityNormalized: null,
        preparations: null
      },
      source: {
        gbifOccurrenceKey: "3031163206",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/b8debc91-d980-4d64-957c-cf63533187fb",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/13cb5151-0923-4948-a164-d3903d79e273",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      image: {
        version: "1",
        display: "zukan_cards/processed/NHMUKNHMUK014168924_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUKNHMUK014168924_L1_segmented.png",
        original: "zukan_cards/original/NHMUKNHMUK014168924_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUKNHMUK014168924_54.webp",
        thumb108: "zukan_cards/thumb/NHMUKNHMUK014168924_108.webp",
        thumb216: "zukan_cards/thumb/NHMUKNHMUK014168924_216.webp"
      },
      modifications: ["cropped", "background removed", "color adjusted"]
    },
    "emperor_cicada": {
      speciesId: "emperor_cicada",
      scientificName: "Megapomponia imperatoria",
      jaName: "テイオウゼミ",
      creditLine: "Natural History Museum, London",
      creator: "Natural History Museum, London",
      sexCovered: "m",
      specimen: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "NHMUK013385300",
        occurrenceId: "1f82cc81-afc5-4c1c-aa3b-5d3f05746ab7",
        persistentId: "1f82cc81-afc5-4c1c-aa3b-5d3f05746ab7",
        basisOfRecord: "PRESERVED_SPECIMEN",
        typeStatus: null,
        sex: "Male",
        lifeStage: null,
        recordedBy: null,
        eventDate: null,
        eventYear: null,
        country: "Malaysia",
        localityVerbatim: null,
        localityNormalized: "Malaysia",
        preparations: null,
      },
      source: {
        gbifOccurrenceKey: "1847649861",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/1f82cc81-afc5-4c1c-aa3b-5d3f05746ab7",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/9794628c-d46c-4349-a67d-c799d200838e",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      },
      image: {
        version: "1",
        display: "zukan_cards/processed/NHMUK013385300_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUK013385300_L1_segmented.png",
        original: "zukan_cards/original/NHMUK013385300_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUK013385300_54.webp",
        thumb108: "zukan_cards/thumb/NHMUK013385300_108.webp",
        thumb216: "zukan_cards/thumb/NHMUK013385300_216.webp",
      },
      modifications: ["cropped", "background removed", "color adjusted"],
    },

    "kumoma_benihikage": {
      speciesId: "kumoma_benihikage",
      scientificName: "Erebia ligea",
      jaName: "クモマベニヒカゲ",
      creditLine: "Natural History Museum, London",
      creator: "Natural History Museum, London",
      sexCovered: "m",
      specimen: {
        institution: "Natural History Museum, London",
        institutionCode: "NHMUK",
        collectionCode: "BMNH(E)",
        catalogNumber: "BMNH(E)501693",
        occurrenceId: "3d9d726f-0542-4f20-bf3d-59c34e6f3e85",
        persistentId: "3d9d726f-0542-4f20-bf3d-59c34e6f3e85",
        basisOfRecord: "PRESERVED_SPECIMEN",
        typeStatus: null,
        sex: null,
        lifeStage: null,
        recordedBy: null,
        eventDate: null,
        eventYear: null,
        country: "United Kingdom of Great Britain and Northern Ireland",
        localityVerbatim: null,
        localityNormalized: "Township: Galashiels, United Kingdom of Great Britain and Northern Ireland",
        preparations: null,
        decimalLatitude: 55.6237,
        decimalLongitude: -2.8144,
      },
      source: {
        gbifOccurrenceKey: "1291271925",
        institutionRecordUrl: "https://data.nhm.ac.uk/object/3d9d726f-0542-4f20-bf3d-59c34e6f3e85",
        sourceMediaUrl: "https://data.nhm.ac.uk/media/b4a9d558-375b-4a8f-a0ed-faceaec79800",
        datasetKey: "7e380070-f762-11e1-a439-00145eb45e9a",
        metadataLicense: "CC0-1.0",
        mediaLicense: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      },
      image: {
        version: "1",
        display: "zukan_cards/processed/NHMUKBMNHE501693_L2_grade.webp",
        segmented: "zukan_cards/processed/NHMUKBMNHE501693_L1_segmented.png",
        original: "zukan_cards/original/NHMUKBMNHE501693_original.jpg",
        thumb54: "zukan_cards/thumb/NHMUKBMNHE501693_54.webp",
        thumb108: "zukan_cards/thumb/NHMUKBMNHE501693_108.webp",
        thumb216: "zukan_cards/thumb/NHMUKBMNHE501693_216.webp",
      },
      modifications: ["cropped", "background removed", "color adjusted"],
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
