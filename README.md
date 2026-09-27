# NassuKatou

Portfolio for Katou: short-form VTuber edits, plus design and build of portfolio sites for creators. The site is a mobile-first hub. Prices and service status are filled in. Social links are still placeholders. See [CONTENT.md](CONTENT.md) before changing content.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run check
```

`npm run dev` serves the site locally. `npm run build` writes a static site to `dist/`. `npm run check` typechecks.

## Stack

Astro, Tailwind CSS, TypeScript, and Preact islands for the clip preview, the full-screen viewer, and the Works filters. Everything else is static HTML and CSS.

## Deploy to Vercel

Framework preset: **Astro**. The project is a static site (`output: 'static'` in `astro.config.mjs`), so it does not need a Vercel adapter.

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Set `site` in `astro.config.mjs` to the real domain when you have one.

Preview MP4s live in `public/media/previews/`. The build copies them to `dist/media/previews/`, and the site requests them at `/media/previews/`. `vercel.json` caches that path for a year. CONTENT.md explains how to move the loops to Vercel Blob or another CDN later (`previewBase` in `src/data/site.ts`).
