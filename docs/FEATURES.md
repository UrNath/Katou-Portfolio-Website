# NassuKatou site features

How each part of the site works and how to change it by hand. Paths are from the repo root. After any change run `npm run check` and `npm run build`; both must finish with 0 errors.

General rules

- Only use confirmed content. Never invent a price, client, link, or description.
- A missing fact is a placeholder. On Meet the Clients, write `null` (see section 1). Elsewhere, leave the item out.
- JSON files need double quotes and no trailing commas. A broken JSON file fails the build.
- Do not rename `id` values that already exist. Other files point at them.
- No secrets go in this repo. Sign-in keys live in Vercel environment variables (see README.md).

---

## 1. Meet the Clients page (`/clients`)

What it does: one screen per client, like a character-select menu. Art on one side; name, three chips (Type, Class, Element), description, Highlights and Skins tabs, a Main weapon strip, and YouTube / Discord / TikTok links on the other.

Files

| What | Where |
|---|---|
| Client facts, colours, skins | `src/data/clients.ts`, object `clientProfiles` |
| Which clients exist, their names and order | `src/data/works-layout.json`, array `creators` |
| Picks the highlight clips | `src/pages/clients.astro` |
| Layout, styles, all behaviour | `src/components/ClientGallery.astro` |
| Art files | `public/clients/` |

A client shows on the page when its `id` is in `creators` and it has either a video in `src/data/clips.json` or an entry in `clientProfiles`.

Format of one entry in `clientProfiles` (the key must equal the creator `id`):

```ts
chi: {
  description: null,                       // text, or null = placeholder
  type: 'Vampire pup',                     // or null
  role: 'Mage',                            // the Class chip, or null
  element: 'Blood',                        // or null
  weapon: 'Blood scythe, made from her blood', // or null
  socials: { youtube: 'https://www.youtube.com/@chiseyi', discord: null, tiktok: 'https://www.tiktok.com/@chiseyivt' },
  palette: { panel: '#5a1622', deep: '#22070d', accent: '#ff6b78', rim: '#ffe9ec' },
  skins: [ /* see section 6 */ ],
  reels: ['chi-c3', 'chi-c4', 'chi-c1'],   // optional, see section 2
},
```

Placeholders: any field set to `null` prints the word "placeholder" on the page in italics with a dashed edge. To mark a new placeholder, set the field to `null`. Do not type the word "placeholder" as a value.

Change a name

1. Open `src/data/works-layout.json`.
2. In `creators`, change `label` for that client. Leave `id` alone.
3. This also renames the filter chip on Works.

Change type, class, element, weapon, description, or a social link

1. Open `src/data/clients.ts`.
2. Find the client's block in `clientProfiles`.
3. Replace the value in quotes, or write `null` to show a placeholder. Links must start with `https://`.

Change the colours

1. In the client's `palette`: `panel` is the lighter backdrop, `deep` the darker backdrop, `accent` the highlight colour (chips, diamonds, glow), `rim` the thin light edge around the art. Use hex colours.

Add a client

1. In `src/data/works-layout.json`, add `{ "id": "newid", "label": "Name" }` to `creators`. Use lowercase letters for `id`.
2. In `src/data/clients.ts`, add a block to `clientProfiles` with the same key. Copy the `miu` block, which is all placeholders.
3. Build. The client appears with a dashed "Character art placeholder" frame and placeholder diamonds until videos exist.

Remove a client

1. Delete its block from `clientProfiles`.
2. To also remove it from Works, delete it from `creators`. Its videos in `clips.json` then have no chip; remove or reassign them in `/admin` first.

Do not touch: the `data-*` attribute names and class names in `ClientGallery.astro`. The script finds elements by them; renaming one silently breaks switching, tabs, or diamonds.

Known limits: Miu has no art. Descriptions and Discord links are placeholders for all clients. Pidge has no class, element, or weapon yet. YouTube links were built from the channel handles on the clips and should be confirmed.

## 2. Highlight diamonds

What it does: three diamonds per client. Hovering with a mouse, focusing with the keyboard, or the first tap on a phone turns the diamond into a small silent looping video in the same spot. Clicking (or a second tap) opens the reel large in the middle of the screen. Esc, the close button, or a click on the dark backdrop closes it. Nothing plays by itself, and the video file is only downloaded on first use; the poster image shows first.

How it picks videos: `src/pages/clients.astro` takes that client's vertical clips that have a preview file, featured clips first, and uses the first three. A missing slot shows a dashed "Placeholder" diamond.

Choose the three videos yourself

1. Find the clip ids in `src/data/clips.json` (for example `"id": "pidge-p7"`). The clip needs a `preview` file.
2. In `src/data/clients.ts`, add `reels: ['pidge-p7', 'pidge-p8', 'pidge-p3'],` to that client's block.
3. Fewer than three ids leaves the rest as placeholders. `reels: []` makes all three placeholders.

Swap a video or its poster: the diamond uses the clip's own files, so follow "Change a video's poster or preview" in section 8.

Sizes and timing live in the `<style>` block of `ClientGallery.astro`: `.gem-face` (size, and `.45s` morph time) and, for phones, the `clamp(44px, 7.6svh, 68px)` values. Keep the first number at 44px or more so the diamond stays tappable.

Known limits: with reduced motion or data saver on, the diamond shows the poster only. The dialog plays the short preview loop; "Watch the full video" links to YouTube.

## 3. Client switch animation

What it does: the Switch client button, the name tabs, and the left/right arrow keys change client. The text slides out, a slanted band in the next client's colour crosses the screen, and the new art, text, and diamonds arrive in order. With reduced motion it is a plain fade.

Change the timing (both places must agree)

1. In `src/components/ClientGallery.astro`, find `const SWITCH = { leave: 340, enter: 900, reducedLeave: 160, reducedEnter: 200 };`. Values are milliseconds: `leave` is how long the old client takes to go, `enter` how long the new one takes to settle.
2. In the same file's `<style>` block, the matching animations are under "Switch choreography": `.wipe.is-running` (820ms), `.is-leaving ...` (240 to 320ms), `.is-entering ...` (560 to 900ms).
3. Keep every `.is-leaving` time at or below `leave`, and every `.is-entering` time plus its delay at or below `enter`. If `enter` is shorter than the animations, they get cut off.

Do not animate anything except `transform` and `opacity` here; other properties make it stutter on phones.

## 4. Phone layout (one 9:16 screen)

What it does: on upright screens the whole page is exactly one screen tall (`100svh`) and never scrolls. Art fills the top; the name overlaps its base; details stack below. It is sized so everything fits a 9:16 phone under the navbar.

Where: `ClientGallery.astro`, `<style>` block, the rule `@media (max-aspect-ratio: 1/1)` and the smaller ones after it.

- Below 700px tall: the description is cut to one line and diamond labels hide.
- Below 380px wide: the Switch client button and confirmed social links show as icons only.

If you add content to the info column (a new row, longer text), check a 360x640 screen afterwards. If the art becomes too small or the bottom row is cut off, shrink something else. Do not remove `height: 100svh` or `grid-template: minmax(0, 1fr) auto / minmax(0, 1fr)`; the page would start scrolling or overflow sideways.

Known limits: sideways phones and narrow landscape windows use the desktop layout and can scroll. Desktop is unchanged by these rules.

## 5. Phone swipe

What it does: dragging sideways moves the current client with the finger while the next or previous one slides in beside it. Letting go past the threshold finishes the change; otherwise both slide back. Vertical drags and small movements are ignored, so taps on diamonds still work. With reduced motion nothing follows the finger and a completed swipe uses the fade.

Change the feel

1. In `src/components/ClientGallery.astro`, find `const SWIPE = { start: 10, distance: .28, velocity: .45, settle: 280 };`.
2. `start`: pixels of sideways movement before it counts as a swipe. Lower than about 8 makes taps turn into swipes.
3. `distance`: share of the screen width that commits the change (`.28` = 28%).
4. `velocity`: flick speed in pixels per millisecond that commits a short swipe.
5. `settle`: milliseconds for the slide to finish or snap back.

## 6. Skins tab

What it does: the Skins tab lists alternative art for a client. Picking one swaps the art (and its painted background if it has one).

Format of one skin in a client's `skins` array (the first skin is the default):

```ts
{
  id: 'rat-thief',            // unique within this client, lowercase
  label: 'Rat Thief',
  note: 'Former persona',     // small line under the label
  art: { src: '/clients/pidge-foreground.webp', width: 1128, height: 1536,
         height_pct: 118, bottom_pct: -14, right_pct: -3 },
  background: '/clients/pidge-background.webp',   // optional
},
```

- `art: null` shows the dashed art placeholder.
- `width` and `height` are the image's real pixel size.
- `height_pct`, `bottom_pct`, `right_pct` place the art on desktop, as percentages of the stage: how tall, how far up from the bottom, how far in from the right. Negative numbers push a cropped edge off screen.
- For a rectangular picture with no transparent background, add `framed: true` and optionally `focus: '66% 50%'` (which part stays visible when cropped). It is shown in a 4:3 frame. Chi's art works this way.

Add a skin

1. Put the image in `public/clients/` (WebP or PNG; a transparent background if it is a cutout).
2. Add a skin object to that client's `skins` array in `src/data/clients.ts`.
3. Build and check desktop and phone. Adjust the three `_pct` numbers until it sits well.

Remove a skin: delete its object. Keep at least one skin per client.

## 7. Home page and sample carousel

Home (`src/pages/index.astro`) has: hero, What I do, Featured works (carousel), Editing, Web design, Terms, Contact. Styles are in `src/styles/scroll-portfolio.css`.

- Hero art is a placeholder until human-drawn art exists. To turn real art on, set `characterArt.enabled` to `true` and `src` to the image path in `src/data/site.ts`.
- What I do cards read title, subtitle, and "from" price from the service files in section 9.
- Section-to-section snapping is in `src/lib/home-scroll.ts`. Each new `<section>` in `index.astro` needs an `id`.

Carousel

| What | Where |
|---|---|
| Which clips, in what order | `src/data/hub-order.json`, array `order` |
| A clip must also have | `"featured": true` in `src/data/clips.json` |
| The clip shown first | the one with `"heroFeatured": true` (exactly one) |
| Movement and timing | `src/lib/featured-carousel.ts` (slide time is the `560` in `progress`) |

Change the carousel: edit it in `/admin` ("home reel"), or by hand set `featured` on the clip and add its id to `order`. Only the first five are shown. The centre sample plays on hover, focus, or its play button, never by itself.

## 8. Works page and filters (`/works`)

| What | Where |
|---|---|
| Videos | `src/data/clips.json`, array `clips` (newest first) |
| Client chips, sections, tag chips | `src/data/works-layout.json`: `creators`, `sections`, `tags` |
| Thumbnail gallery | `src/data/thumbnails.json` |
| Filter behaviour | `src/islands/WorksFilters.tsx`, `src/data/tags.ts` |
| Posters | `src/assets/posters/` or `public/media/posters/` |
| Preview loops | `public/media/previews/` |

The easiest way to change any of this is the private editor at `/admin`.

One clip in `clips.json`:

```json
{
  "id": "chi-c1",
  "creator": "Chi",
  "channelHandle": "@chiseyi",
  "title": "is chi an alpha ?",
  "youtubeUrl": "https://www.youtube.com/shorts/zXEW0ZUERDo",
  "tiktokUrl": null,
  "uploadDate": "2026-09-15",
  "durationSec": 43,
  "orientation": "vertical",
  "aspectRatio": "9:16",
  "poster": "posters/chi-c1.webp",
  "preview": "previews/chi-c1.mp4",
  "tags": [],
  "featured": false,
  "heroFeatured": false
}
```

Add a video: follow "Add a clip" in `CONTENT.md` (poster, 5-second silent preview, then the JSON entry). `creator` must match a `label` in `creators`.

Change a video's poster or preview: replace the file with the same name, or use Edit thumbnail in `/admin` → Videos.

Add or rename a filter chip: client chips are `creators`; tag chips are the `tags` list (labels, for example `"Gaming"`); sections are `sections`. A clip shows under a tag when the same label is in its `tags`.

Do not add back the ids listed under "Do not add these clip ids back" in `CONTENT.md`; they are not Katou's edits.

## 9. Pricing

| What | Where |
|---|---|
| Editing packages, add-ons, lists | `src/content/services/editing.md` (the block between the `---` lines) |
| Web design packages | `src/content/services/web-design.md` |
| Open / Waitlist / Closed and the "updated" month | `src/data/status.json` |

Change a price

1. Open the service file.
2. Change `price` under the right entry in `tiers`, and `fromPrice` at the top if the cheapest price changed. Web design also has `fromApprox` and each tier's `approx` (the peso line).
3. Keep the spacing: two spaces per level. Wrong indentation fails the build.

Change availability: in `src/data/status.json` set `editing` or `webDesign` to `"open"`, `"waitlist"`, or `"closed"`.

Prices can also be edited at `/keystatic`. Never write a price inside a component.

## 10. Contact

| What | Where |
|---|---|
| Email and social links | `src/data/site-settings.json` (`email`, `socials`) |
| "Before you write" notes | `src/data/contact.json`, array `guidelines` |
| Service options in the form | `src/data/contact.ts`, `contactServices` |
| The form | `src/components/ContactSection.astro` |

The form does not send anything to a server. Submitting opens an email draft to the address in `site-settings.json`.

Known placeholder: the second line of `guidelines` says the reply time is a placeholder. Replace it with the real reply window.

## 11. Terms

`src/data/terms.json`, array `sections`. Each has `id`, `title`, and `paragraphs`. Do not change an `id`: links such as `/terms#refunds` use it. Editable in `/admin` and `/keystatic`.

## 12. Navigation bar

Links: `src/data/site.ts`, array `navLinks` (`href`, `label`). Phone menu routes: `src/data/routes.ts`. The tab look (uppercase labels, slanted block on the current page) is at the end of `src/styles/scroll-portfolio.css` under "Tab-style navigation". A page can recolour it by setting `--nav-accent`; Meet the Clients does this with the current client's colour.

## 13. Opening curtain

`src/components/SiteIntro.astro`. On Home it shows once per browser session. On Meet the Clients it lifts when the first client's art has loaded. It is skipped with reduced motion.

## 14. Admin and content management

- `/admin` (the studio): videos, home reel, client chips, sections, thumbnails, tags, Terms. Sign-in is GitHub, UrNath account only. Saving commits to GitHub and Vercel rebuilds.
- `/keystatic`: prices, status, contact notes, Terms.
- Setup steps and the names of the required environment variables are in `README.md`. Values are never stored in the repo.
- The studio does not edit `src/data/clients.ts`. Meet the Clients facts are changed by hand as in section 1.

Do not touch `src/middleware.ts`, `src/pages/api/admin/`, or `src/lib/admin-session.ts` unless you are fixing sign-in. A mistake there locks the editor.
