# Cloudflare Pages hosting

This directory contains the minimal hosting adapter for the household Quest4Bugs site.

## Build

```bash
node cloudflare/build-static.mjs
```

Output directory:

```text
dist-pages
```

The build is allowlist-based. It intentionally does not publish repository root or development/internal material.

## Cloudflare Pages settings

Use Git integration for `shtshbt/quest4bugs`.

- Build command: `node cloudflare/build-static.mjs`
- Build output directory: `dist-pages`
- Root directory: repository root
- Pages Functions: none

Keep GitHub Pages live during preview and production-origin validation. Do not make the repository private until the Cloudflare production origin has recovered the existing Fieldnote-backed household data and passed a read/write/reload round trip.

After the repository becomes private, require one fresh Cloudflare deployment from the private repository before retiring GitHub Pages.
