import { access, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");
const out = join(root, "dist-pages");

// Explicit allowlist. Cloudflare must publish only browser runtime material,
// never the repository root.
const runtimeEntries = [
  "index.html",
  "battle.html",
  "manifest.webmanifest",
  "sw.js",
  "assets",
  "shared",
  "kanji",
  "keisan",
  "eitango",
  "komorebi",
  "zukan_cards",
  "zukan_config/zukan_catalog.js",
];

const forbiddenTopLevel = [
  ".git",
  ".github",
  ".claude",
  ".claude_plan",
  "cloudflare",
  "contracts",
  "docs",
  "photo_audit",
  "scripts",
  "tests",
  "tools",
  "zukan_foundry",
  "CLAUDE.md",
  "BLOCKED_DECISIONS.md",
  "README.md",
  "mock_home_map_a.html",
  "mock_home_map_b.html",
  "mock_home_map_c.html",
  "mock_home_map_generation_frame.html",
  "test_zukan.html",
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of runtimeEntries) {
  const src = join(root, entry);
  const dst = join(out, entry);
  if (!(await exists(src))) {
    throw new Error(`Required runtime path is missing: ${entry}`);
  }
  await mkdir(dirname(dst), { recursive: true });
  await cp(src, dst, { recursive: true });
}

for (const entry of forbiddenTopLevel) {
  if (await exists(join(out, entry))) {
    throw new Error(`Forbidden path leaked into runtime artifact: ${entry}`);
  }
}

for (const entry of runtimeEntries) {
  if (!(await exists(join(out, entry)))) {
    throw new Error(`Runtime artifact is incomplete: ${entry}`);
  }
}

console.log(`Cloudflare Pages runtime artifact ready: ${relative(root, out)}`);
console.log(`Included ${runtimeEntries.length} explicit runtime paths; repository internals were not copied.`);
