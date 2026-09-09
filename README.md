# binal.pub

Binal Patel's blog, built with Astro and Markdown. A continuous pixel-art river accompanies the writing, with gently flowing water and a turning mill wheel.

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

Set `draft: false` when ready, commit, and deploy. The writing index, archive, topic pages, RSS, sitemap, and docks update automatically. Posts dated in the future are omitted until a build on or after that date. No scenery edits are needed, even with long titles or more posts. Keep `permalink` unchanged after publishing so existing links remain valid.

For images or video, put files in `public/` (for example `public/media/my-post/diagram.png`) and reference their public path in Markdown: `![Diagram](/media/my-post/diagram.png)`. Use ordinary HTML `<video controls playsinline preload="metadata">` for video. Astro highlights fenced code blocks automatically.

## Where things live

- `content/post/`: all seven migrated articles, plus future posts.
- `content/about.md` and `content/contact.md`: editable profile pages.
- `src/styles/global.css`: typography, layout, colors, and responsive rules.
- `src/components/River.astro` and `src/scripts/river.ts`: isolated scenery and motion.
- `public/art/`: two transparent raster assets. Their creation prompts are in `docs/art-prompts.md`.
- `src/lib/paths.mjs`: shared URL, draft filtering, and pagination rules.
- `tests/migration-manifest.json`: original post URLs and media checksums.

The river uses one small canvas at a capped 24 fps. Water pixels refract gently; a masked region inside the mill wheel rotates. It pauses when the tab or scenery is out of view, respects reduced-motion preferences, and has a persistent pause control. The original image remains visible if JavaScript or canvas is unavailable. On phones the artwork becomes a small source of the river beside the introduction, keeping the writing full width. Article pages on phones omit the scenery.

Docks belong to article rows in CSS, so their position follows the content without JavaScript measurements. The river is sticky beside long pages; it does not grow into an enormous illustration as the archive grows.

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

The river layout has been checked in the browser on the homepage and an article at 1440px, 1082px, 900px, and 390px viewport widths, including scrolling through the article. Both routes share the same scenery dimensions and opacity on desktop; the image and animated canvas preserve their intrinsic aspect ratios. This was a focused river-layout check, not a full-site browser audit.
