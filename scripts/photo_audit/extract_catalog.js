#!/usr/bin/env node
/* Usage: node extract_catalog.js zukan_catalog.js bugs.js */
"use strict";

const fs = require("fs");
const vm = require("vm");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (process.argv.length !== 4) {
  fail("usage: extract_catalog.js CATALOG_JS BUGS_JS");
}

try {
  const catalogText = fs.readFileSync(process.argv[2], "utf8");
  const bugsText = fs.readFileSync(process.argv[3], "utf8");
  const match = catalogText.match(/var\s+ALLOWED_MEDIA_LICENSES\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) {
    fail("ALLOWED_MEDIA_LICENSES was not found in catalog");
  }

  const allowedMediaLicenses = Object.keys(JSON.parse(match[1]));
  const ctx = { window: {}, console: { warn() {}, log() {}, error() {} } };
  ctx.global = ctx;
  vm.createContext(ctx);
  vm.runInContext(catalogText, ctx, { filename: process.argv[2] });
  vm.runInContext(bugsText, ctx, { filename: process.argv[3] });

  const catalog = ctx.window.Q4B_ZUKAN_INDEX;
  const bugs = ctx.window.Q4B_BUGS;
  if (!catalog || !Array.isArray(bugs)) {
    fail("catalog or bugs data was not exported by the input files");
  }
  const selectedBugs = bugs.map((bug) => ({
    id: bug.id,
    jaName: bug.jaName,
    scientificName: bug.scientificName,
    taxonRank: bug.taxonRank,
    order: bug.order,
    family: bug.family,
  }));
  process.stdout.write(JSON.stringify({ catalog, bugs: selectedBugs, allowedMediaLicenses }));
} catch (error) {
  fail(`catalog extraction failed: ${error.message}`);
}
