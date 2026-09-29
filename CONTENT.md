# Content

Placeholder copy, prices, statuses, and clips live in data files. Components read those files. Do not hardcode a price or a status in a component.

The contact email is `nassukatou@gmail.com`. Socials are Discord, YouTube, TikTok, and X, all under `nassukatou`, in `src/data/site-settings.json`. Clip pages are real edits for Pidge, Chi, and Miu.

Editing has one real package: **Short edit**, PHP 1,000, up to 1 minute, for YouTube Shorts or TikTok (9:16), unlimited minor revisions, 2 major revisions, and a 1 to 3 day turnaround. Includes lists those lines without placeholder markers. Add-ons: an extra major revision is PHP 250 (≈ $4), and a thumbnail is PHP 500 each (≈ $8). The dollar lines use the web design rate, ₱3,800 = $60.

Web design prices are real, in `src/content/services/web-design.md`. USD is the listed price. Each tier has `approx` for the smaller muted peso line (`≈ ₱…`). Link Hub is $60 (≈ ₱3,800), Portfolio is $200 (≈ ₱12,500), Full Custom is $450 (≈ ₱28,000). Add-ons: Extra page $15, Rush +50%, Extra revision round $10, Maintenance $20/month. There is no launch discount. `Prices updated Sep 2026` comes from `src/data/status.ts`. Editing and web design are both `open`, shown as “Open”.

The visual layer is Paper & Stage: cream page, white tiles, and a dark stage for the hub banner, the editing price card, the footer, and the clip viewer. `characterArt` in `src/data/site.ts` is off. Turn it on only for human-drawn art. Editing’s “I take” and “I don’t take” lists are marked with a TODO for Katou to review. Web design takes link hubs, portfolios, custom sites, stores and checkout, and full web apps, and its “I don’t take” list is empty.

`/terms` follows the VGen terms at vgen.co/ByAvery, including the Shorts scope and the revision split. The 50% down payment from that page is omitted. The general section does not call the style high-retention or fast-paced. `/terms#refunds` is the payment section. `/terms#revisions` defines minor and major, and prices an extra major revision at PHP 250 (≈ $4). Public copy says commission, not booking.

Compare tiers is hidden while a service has only one tier. To add a package, append a tier and one value on every `compare` row. The disclosure and the swipe row come back when there are two or more tiers.

## Where things live

| What | File |
|---|---|
| Editing and Web design status, and the “updated” month | `src/data/status.ts` |
| Name, role, email, social URLs | `src/data/site.ts` |
| Hub route labels | `src/data/routes.ts` |
| Editing packages, tiers, add-ons, scope | `src/content/services/editing.md` |
| Web design packages, process, tiers, add-ons | `src/content/services/web-design.md` |
| Terms and FAQ | `src/data/terms.ts` |
| Contact form options and guidelines | `src/data/contact.ts` |
| Filter tag labels | `src/data/works-layout.json` `tags`, rendered by `src/data/tags.ts` |
| Clip list | `src/data/clips.json` |
| Posters | `src/assets/posters/` |
| Preview loops | `public/media/previews/` |

Status is one value per service: `'open'`, `'waitlist'`, or `'closed'`. The visible words are in `statusLabel` in `src/data/status.ts` (`Open`, `Waitlist`, `Closed`). Closed turns the service button into “Join the waitlist”. Waitlist keeps the normal label.

`/terms#refunds` opens the payment section. Section ids are in `src/data/terms.ts`.

## Clips

`src/data/clips.json` is the list, newest first. The hub and Works counts (`47 edits`) are `clips.length`. View counts and `tiktokMatchConfidence` are not shown. `tagsSuggested` is true on every item, so the tags are kept. Tag chips come from `works-layout.json` and stay visible even when no clip uses that tag yet.

The hub is featured-only. It centers `chi-c3` (`heroFeatured`). The dimmed neighbors, the Works thumbnails, and the hub viewer use only the featured clips, in this order: `chi-c3`, `chi-c4`, `pidge-p7`, `pidge-p8`, `pidge-p3`. Miu stays on `/works`, newest first. Cards read `Edit for @handle` (Pidge `@pidgeira`, Chi `@chiseyi`, Miu `@miuonivt`).

Landscape items (`orientation: "landscape"`, 16:9) render in the Longer edits row on `/works`. `miu-ms17` is square in the source and already padded to 9:16, and its `orientation` is `vertical`, so it stays in the short grid. The viewer sizes the frame to 9:16 or 16:9 from that same flag.

Creator chips come from `src/data/works-layout.json`, in that order, and stay visible even when a new client has no videos yet. The current chips are `/works?creator=pidge`, `/works?creator=chi`, and `/works?creator=miu`. Tag chips use `/works?tag=` plus the slug (`highlights`, `gaming`, `funny`, `karaoke-music`, `mv`, `collab`). One filter is active at a time.

Works sections also come from `works-layout.json`. Shorts hold vertical clips, Longer edits hold landscape clips, and a clip with `section` set is filed into that section. Thumbnails live in `src/data/thumbnails.json` and only appear once that list has an item. Empty sections stay off the page.

### Add a clip

1. Add the poster WebP to `src/assets/posters/{id}.webp`. Vertical posters are 540×960. Landscape posters are 960×540. The build emits AVIF and WebP through `astro:assets`.
2. Add a muted H.264 MP4, about 5 seconds, faststart, no audio, to `public/media/previews/{id}.mp4`.
3. Append an object to `src/data/clips.json` (newest at the top). Fields the site reads: `id`, `creator`, `channelHandle`, `title`, `youtubeUrl`, `tiktokUrl` (or `null`), `uploadDate`, `durationSec`, `orientation` (`vertical` or `landscape`), `aspectRatio`, `poster`, `preview`, `tags`, `featured`, `heroFeatured`. Leave `viewCount` and `tiktokMatchConfidence` out of the UI.
4. Only one clip should have `heroFeatured: true`. That clip also gets the page-transition name. Other `featured` clips are the hub’s previous and next.
5. Tapping a clip embeds the original YouTube or TikTok post, with sound. The hover loops stay silent. A null `tiktokUrl` hides the TikTok button. Previews stay `preload="none"` until the card is on screen, and only one plays. `prefers-reduced-motion` and Save-Data stay on the poster.

### Move previews to Vercel Blob or a CDN

The loops are about 13 MB and are committed under `public/media/previews/` for now. `vercel.json` caches `/media/previews/*` for a year. To serve them from Blob or another CDN later:

1. Upload every file in `public/media/previews/` to the bucket. Keep the file names (`miu-ms5.mp4`).
2. Set `previewBase` in `src/data/site.ts` to the origin with no trailing slash, for example `https://….public.blob.vercel-storage.com/previews`. `src/lib/clips.ts` then requests `{previewBase}/{filename}` instead of `/media/previews/{filename}`.
3. Delete `public/media/previews/` from the repo so the static build stops shipping the MP4s.
4. Leave the posters in `src/assets/posters/`. Those stay in the image pipeline.

## Editor

`/admin` is the studio. It is unlisted and `noindex`. Use it to add or remove videos, arrange the home reel, add a client filter, add a section (shorts, long videos, thumbnails, or a custom group), add thumbnails, edit the tag filters, and edit the Terms page (`src/data/terms.json`). Prices and contact stay in Keystatic at `/keystatic`. The README has the GitHub sign-in steps for the studio, and the separate Keystatic GitHub App.

The chips after the client names on Works are the `tags` list in `src/data/works-layout.json`. The Tags tab in the studio renames, reorders, and removes them. A new tag shows on Works after Save. Choosing it leaves the videos that use that tag. A tag with no video still shows, so it can be filed onto clips first. An empty list hides those chips. The search box matches titles, client names, and tags, and it stays on when a chip is selected.

Do not add these clip ids back. They are not Katou’s edits: `miu-ms25` (ROSÉ & Bruno Mars APT. Valorant parody), `miu-mv1` (Miu's London Anime and Gaming Con 2026 Performance), `miu-mv40` (kawaikute gomen HoneyWorks cover), `pidge-p6` (pidge stream core no. 1). They are also filtered out in `src/lib/clips.ts`, and `pidge-p6` is not in `src/data/hub-order.json`.

Saving Editing or Web design rewrites that markdown file. Comments in the frontmatter are not kept. Editing’s “I take” and “I don’t take” fields are marked as drafts in the editor.
