import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const out = join(root, "dist-commercial");
const excludedTop = new Set([
  ".git", ".github", ".claude", ".claude_plan", "node_modules",
  "cloudflare", "functions", "tests", "tools", "scripts", "docs", "contracts",
  "dist-commercial"
]);
const excludedRootFiles = new Set([
  ".gitignore", "CLAUDE.md", "README.md", "BLOCKED_DECISIONS.md"
]);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excludedTop.has(entry.name) || excludedRootFiles.has(entry.name)) continue;
  if (entry.name.startsWith(".") && entry.name !== ".nojekyll") continue;
  await cp(join(root, entry.name), join(out, entry.name), { recursive: true });
}

// Only API paths invoke Pages Functions; ordinary Q4B assets remain static requests.
await writeFile(join(out, "_routes.json"), JSON.stringify({
  version: 1,
  include: ["/api/*"],
  exclude: []
}, null, 2) + "\n");

console.log(`Commercial static bundle ready: ${relative(root, out)}`);
