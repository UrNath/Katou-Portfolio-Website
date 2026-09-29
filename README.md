# NassuKatou

Portfolio for Katou: short-form VTuber edits, plus design and build of portfolio sites for creators. The site is a mobile-first hub. Prices, service status, email, and social links are filled in. See [CONTENT.md](CONTENT.md) before changing content.

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

Framework preset: **Astro**. Public pages are still static HTML. A Vercel adapter is included only so the private editor at `/admin` can sign in.

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

`site` is `https://nassukatou-site.vercel.app`. Change it in `astro.config.mjs` if the domain changes.

Preview MP4s live in `public/media/previews/`. The build copies them to `dist/media/previews/`, and the site requests them at `/media/previews/`. `vercel.json` caches that path for a year. CONTENT.md explains how to move the loops to Vercel Blob or another CDN later (`previewBase` in `src/data/site-settings.json`).

## Editing the site

Open `/admin` (it is not linked from the public pages). That editor is for Works and the Terms page: add or remove videos, arrange the home reel, add a client filter, add a section (shorts, long videos, thumbnails, or a custom group), add thumbnails, edit the tag filters, and edit the terms. Save on your computer writes the files in this repo. On Vercel the editor reads those files from the deploy, because the function has no `src/data` folder on disk.

Prices, status, and contact notes stay in [Keystatic](https://keystatic.com) at `/keystatic`. Terms can also be edited there. On the live site, Keystatic commits to `main` after the one-time GitHub setup below, and Vercel rebuilds. The studio commits the same way once it has a GitHub token.

The tag chips on Works (Highlights, Gaming, and the rest) are labels on the videos, not the Shorts / Longer sections. Edit them in the studio’s Tags tab.

### Live studio save

The live editor cannot write the repo until GitHub accepts a token. Either:

- In the studio, open **Create a token**. Make a fine-grained token for only `UrNath/Katou-Portfolio-Website`, with Contents set to Read and write. Paste it into **Live save** and press Save token. It stays in that browser. Then press Save.
- Or set `ADMIN_GITHUB_TOKEN` to that token in Vercel → Settings → Environment Variables and redeploy. Every browser can then save without pasting.

### One-time GitHub setup

Do this once, signed in as **UrNath**. Do not commit the secrets.

1. Open [New GitHub App](https://github.com/settings/apps/new). Name it `NassuKatou editor`. Homepage URL: `https://nassukatou-site.vercel.app/keystatic`. Turn on “Request user authorization (OAuth) during installation”. Turn the webhook off. Permissions: Contents read and write, Pull requests read-only, Metadata read-only. Install it only on this account.
2. Callback URLs, added one at a time:
   - `https://nassukatou-site.vercel.app/api/keystatic/github/oauth/callback`
   - `http://127.0.0.1:4321/api/keystatic/github/oauth/callback`
   - `http://localhost:4321/api/keystatic/github/oauth/callback`
   - `http://127.0.0.1/api/keystatic/github/oauth/callback`
3. Copy the Client ID, generate a client secret, and copy the app slug from the end of `https://github.com/apps/…`.
4. Install the app on `UrNath/Katou-Portfolio-Website` only.
5. In Vercel → Settings → Environment Variables, add these, then redeploy (the slug is read when the site builds):

| Name | Value |
| --- | --- |
| `KEYSTATIC_GITHUB_CLIENT_ID` | Client ID |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | Client secret |
| `KEYSTATIC_SECRET` | Output of `openssl rand -hex 32` (at least 32 characters) |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | App slug |

6. Bookmark `https://nassukatou-site.vercel.app/admin` and sign in as UrNath.

Four clips are not Katou’s edits and must not be added back: `miu-ms25`, `miu-mv1`, `miu-mv40`, and `pidge-p6`. The site drops them even if they show up in the data again. `pidge-p6` is also not in the home order.
