# binal.pub

Binal Patel's blog, built with Astro and Markdown. A pixel-art garden overlooks a mountain lake at blue hour, with gently moving water and foliage, and fireflies that respond to the reader.

## Work on the site

Requires Node.js 22.12 or newer (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. If Astro starts in background mode, stop it with `npx astro dev stop`; otherwise use Ctrl-C in its terminal.

```sh
npm run check
npm run build
npm test
```

The build produces a fully static site in `dist/`. It needs no server, database, account, or CMS. `npm test` includes checks against that build, so run the build first.

## Publish a post

```sh
npm run new-post -- "A new experiment"
```

This creates a draft in `content/post/YYYY-MM-DD-a-new-experiment/index.md`:

```yaml
---
title: "A new experiment"
date: 2026-09-09
description: "A short sentence for the writing index and RSS."
permalink: /2026/09/a-new-experiment/
tags: [python, llm]
categories: [coding]
draft: true
---

Your Markdown goes here.
```

Set `draft: false` when ready, commit, and deploy. The writing index, archive, topic pages, RSS, and sitemap update automatically. Posts dated in the future are omitted until a build on or after that date. No scenery edits are needed, even with long titles or more posts. Keep `permalink` unchanged after publishing so existing links remain valid.

For images or video, put files in `public/` (for example `public/media/my-post/diagram.png`) and reference their public path in Markdown: `![Diagram](/media/my-post/diagram.png)`. Use ordinary HTML `<video controls playsinline preload="metadata">` for video. Astro highlights fenced code blocks automatically.

## Where things live

- `content/post/`: all seven migrated articles, plus future posts.
- `content/about.md` and `content/contact.md`: editable profile pages.
- `src/styles/global.css`: typography, layout, colors, and responsive rules.
- `src/components/Garden.astro` and `src/scripts/garden.ts`: shared scenery, interaction, and motion.
- `public/art/blue-hour-garden.png`: the garden illustration. Its creation prompt and integration notes are in `docs/blue-hour-garden.md`.
- `src/lib/paths.mjs`: shared URL, draft filtering, and pagination rules.
- `tests/migration-manifest.json`: original post URLs and media checksums.

The garden uses a small WebGL canvas for drifting clouds, independent city lights, greenhouse glow, wind through foliage, and water reflections, plus a 2D canvas for fireflies. It is capped at 30 fps and 1152 drawing pixels wide. It pauses when the tab or scenery is out of view and follows the device's reduced-motion preference. The original image stays visible if JavaScript or WebGL is unavailable. Moving a pointer gathers fireflies; tapping or pressing Enter on the focused garden wakes more and sends a ripple through the water. The scenery has no visible controls or interaction hints.

The homepage shows a wide vista above recent writing. Articles and archive pages use a shallower panorama and a centered reading column. Both use the same image proportions, with cropping rather than stretching. The scene scrolls away before the article body, so long posts keep a quiet reading surface. On phones the garden and writing stack naturally, with touch interactions that allow vertical scrolling.

## Deployment

`netlify.toml` configures the existing Netlify project to build Astro instead of Hugo:

- Install: `npm ci`
- Build: `npm run build`
- Output directory: `dist`
- Node.js: `24`

The production branch is `master`. Push a working branch and open a pull request to review its Netlify deploy preview, then merge it into `master` to publish. Subsequent posts follow the same workflow. Netlify's GitHub integration handles rebuilding and deployment; no manual file upload or DNS change is required when using the existing project.

All original article URLs and media URLs are preserved. About, contact, tags, categories, pagination paths, and RSS remain available. Canonical URLs and the sitemap use `https://binal.pub`. The existing Google Analytics property loads only on `binal.pub` and `www.binal.pub`, so private previews don't add analytics traffic.

`.openai/hosting.json` identifies a separate experimental Sites preview and is not used by Netlify. The live blog is published through the GitHub/Netlify workflow above.

## Migration checks

`npm test` verifies existing routes, media references, local links in the static output, adding a post, stable permalinks, draft/future filtering, and pagination.

`npm run test:migration` is a separate one-time audit of the seven original article bodies and media bytes, allowing only the required syntax conversions. It records the migration baseline; intentional later edits to old posts may differ from that baseline without indicating a site error.

The original river design remains available in Git history. The local `codex/interactive-vistas` branch preserves the three landscape experiments separately from the production garden theme.
