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

What it does: one screen per client, like a character-select menu. Art on one side; name, three chips (Type, Class, Element), description, tabs, a Main weapon strip, and YouTube / Discord / TikTok links on the other.

Tabs: desktop has Highlights and Skins, with the social links in a row underneath. Phones have Info, Skins, and Socials; the links move into the Socials tab. Both read the same `socials` data, so you only edit it once.

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

Known limits: Miu has no art. Chi's art is a full illustration in a frame, not a cutout. Descriptions and Discord links are placeholders for all clients. Pidge has no class, element, or weapon yet. YouTube links were built from the channel handles on the clips and should be confirmed.

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

What it does: on upright screens the whole page is exactly one screen tall (`100svh`) and never scrolls. The art is as wide as the screen allows and continues behind the details; the name, chips, tabs and the open tab sit at the bottom over a dark fade.

Where: `src/components/ClientGallery.astro`, `<style>` block, the rule `@media (max-aspect-ratio: 1/1)` and the smaller ones after it.

How the art is sized (rule `.char` inside that block):

- `--zone` is the clear space between the Switch client row and the details: screen height minus navbar, minus 50px, minus `17.5rem` for the details.
- `--under` is how far the art may run behind the details. `1.5` means the art can be 1.5 times the clear space. Framed art (Chi) uses `1.08`; the placeholder uses `.92`.
- To make art bigger on phones, raise `--under` a little (for example `1.6`). If a face ends up behind the name, lower it.
- If you add rows to the details, raise `17.5rem` by the height you added.

Smaller screens

- Below 700px tall: the description is cut to one line, diamond labels hide, and the Socials tab shows three side-by-side buttons.
- Below 380px wide: the Switch client button shows as an icon.

After any change here, check a 360x640 screen. Do not remove `height: 100svh` or `grid-template: minmax(0, 1fr) / minmax(0, 1fr)`; the page would start scrolling or overflow sideways.

Known limits: sideways phones and narrow landscape windows use the desktop layout and can scroll. Desktop is unchanged by these rules.

## 5. Phone swipe

What it does: a sideways drag plays the same switch animation as the Switch client button (section 3), with your finger as the playhead. Drag further and the old client's text leaves, the slanted band crosses, and the next client arrives; drag back and it rewinds. Letting go past the threshold finishes the change at normal speed; otherwise it plays backwards to where it started. The page itself never slides. Small movements and vertical drags are ignored, so taps on diamonds and tabs still work. With reduced motion nothing follows the finger and a completed swipe uses the fade.

How it works: the script adds the same `is-leaving` / `is-entering` classes the button uses, pauses the animations, and sets their time from the drag distance (functions `scrubStart`, `scrubTo`, `scrubFinish` in `src/components/ClientGallery.astro`). Because it reuses the button's animations, changing the timing in section 3 changes the swipe too.

Change the feel

1. In `src/components/ClientGallery.astro`, find `const SWIPE = { start: 10, travel: .8, distance: .3, velocity: .45 };`.
2. `start`: pixels of sideways movement before it counts as a swipe. Lower than about 8 makes taps turn into swipes.
3. `travel`: how far the finger must move to play the whole animation, as a share of the screen width (`.8` = 80%).
4. `distance`: how much of the animation must be played for a release to finish it (`.3` = 30%).
5. `velocity`: flick speed in pixels per millisecond that finishes a short swipe.

Do not remove the rule `.is-scrubbing :is(.client, .client *, .wipe) { animation-play-state: paused !important; }`. Without it the animation runs on its own instead of following the finger.

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

Home (`src/pages/index.astro`) has: hero, What I do, Featured works (carousel), Pricing (Editing and Web design as two tabs), Terms, Commission. Layout styles are in `src/styles/scroll-portfolio.css`; colours and the dark look are in `src/styles/arcade.css` (section 15). On phones the sections become tabbed screens (section 16).

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
| The two tabs and the section | `src/pages/index.astro`, `<section id="pricing">` |

How it is shown: Home has one Pricing section with two tabs, Editing and Web design. Each tab shows that service's title, "from" price and status, read from the files above. Links to `/#editing` or `/#web-design` (the phone menu, the What I do cards, and the old `/editing` and `/web-design` addresses) open the matching tab. The function `pickPrice` in the `<script>` of `index.astro` does this; do not rename the panel ids `editing` and `web-design`.

Change a price

1. Open the service file.
2. Change `price` under the right entry in `tiers`, and `fromPrice` at the top if the cheapest price changed. Web design also has `fromApprox` and each tier's `approx` (the peso line).
3. Keep the spacing: two spaces per level. Wrong indentation fails the build.

Change availability: in `src/data/status.json` set `editing` or `webDesign` to `"open"`, `"waitlist"`, or `"closed"`.

Prices can also be edited at `/keystatic`. Never write a price inside a component.

## 10. Commission (Discord call to action)

What it does: the Commission section on Home (`/#commission`, also reached from `/contact`) no longer has a form or a "before you write" list. It shows a heading, one line of text, a Discord button, and a Read the Terms button. The nav "Commission" link and the Commission buttons on Home all lead here.

| What | Where |
|---|---|
| Discord link, heading, text | `src/data/commission.ts`, object `commission` |
| The section | `src/components/CommissionCta.astro` |
| Email and social icons in the footer | `src/data/site-settings.json` (`email`, `socials`) |

Format:

```ts
export const commission = {
  discordUrl: null,          // PLACEHOLDER. Or 'https://discord.gg/xxxx'
  heading: 'Message me on Discord.',
  body: 'Commissions start with a Discord message. Read the Terms first, then say hello.',
};
```

Placeholder: while `discordUrl` is `null` the button is a dashed, non-clickable box reading "Discord link placeholder".

Set the real Discord link

1. Open `src/data/commission.ts`.
2. Replace `null` with the full link in quotes, for example `discordUrl: 'https://discord.gg/xxxx',`.
3. Build. The button becomes a solid "Message Katou on Discord" link that opens in a new tab.

To mark it as a placeholder again, set it back to `null`. Never type a made-up link.

Removed with the form: `src/components/ContactSection.astro`, `src/data/contact.ts`, `src/data/contact.json`, and the "Contact notes" entry in `keystatic.config.ts`. Nothing else referred to them.

## 11. Terms

`src/data/terms.json`, array `sections`. Each has `id`, `title`, and `paragraphs`. Do not change an `id`: links such as `/terms#refunds` use it. Editable in `/admin` and `/keystatic`.

## 12. Navigation bar

Links: `src/data/site.ts`, array `navLinks` (`href`, `label`). The desktop bar is Home, Works, Clients, Pricing, Terms, and the Commission button. To add, rename or reorder a link, edit that array; an `href` starting with `/#` must match a section `id` on Home. Phone menu routes: `src/data/routes.ts`. The tab look (uppercase labels, slanted block on the current page) is at the end of `src/styles/scroll-portfolio.css` under "Tab-style navigation". A page can recolour it by setting `--nav-accent`; Meet the Clients does this with the current client's colour.

## 13. Opening curtain

`src/components/SiteIntro.astro`. It is a dark panel with the wordmark and a counter that lifts away. On Home it shows once per browser session. On Meet the Clients it lifts when the first client's art has loaded. It is skipped with reduced motion.

## 14. Admin and content management

- `/admin` (the studio): videos, home reel, client chips, sections, thumbnails, tags, Terms. Sign-in is GitHub, UrNath account only. Saving commits to GitHub and Vercel rebuilds.
- `/keystatic`: prices, status, contact notes, Terms.
- Setup steps and the names of the required environment variables are in `README.md`. Values are never stored in the repo.
- The studio does not edit `src/data/clients.ts`. Meet the Clients facts are changed by hand as in section 1.

Do not touch `src/middleware.ts`, `src/pages/api/admin/`, or `src/lib/admin-session.ts` unless you are fixing sign-in. A mistake there locks the editor.

## 15. Site look ("arcade" theme)

What it does: every public page uses the dark, slanted look of Meet the Clients: dotted dark background with a diagonal split, frosted panels with an accent edge, slanted buttons and chips, striped section labels, large outlined words behind Home sections, and a slanted band that crosses the screen when a page opens.

Where: `src/styles/arcade.css`. It loads after `global.css` and `scroll-portfolio.css` and only restates what changes, so older rules still supply layout.

Common changes

1. Accent colour: in `arcade.css`, the first `.clean-portfolio { ... }` block, change `--accent` and `--teal-ink` (keep them the same). `--on-accent` is the text colour used on top of the accent.
2. Background: the `background:` lines in the same block.
3. The outlined word behind a Home section: the `data-ghost="..."` attribute on that `<section>` in `src/pages/index.astro`. Remove the attribute to remove the word.
4. Page-opening band: `@keyframes arcade-band` and the `::after` rule above it. Delete that rule to turn it off.

The theme applies to pages whose `<body>` has the class `arcade`. `src/components/BaseLayout.astro` adds it to every page except those under `/admin`, so the studio keeps its light look; `/keystatic` is separate and unaffected. Do not change the import order in `BaseLayout.astro`; `arcade.css` must stay last.

## 16. Phone deck (one screen per page, tabs at the bottom)

What it does: on upright phones (up to 767px wide) public pages never scroll as a whole.

- Home: each section is a screen. A tab bar at the bottom (Home, Services, Featured, Pricing, Terms, Commission) switches screens with a slanted band and a slide. The tab bar itself scrolls sideways. On the Pricing screen the Editing / Web design tabs stay pinned at the top while the details scroll.
- Long screens (pricing, Terms) scroll inside themselves. A small "More" tag appears at the bottom while there is more below.
- Works: the title, search and filter rows stay in place; filter rows scroll sideways; the results scroll in their own panel with the same "More" tag.
- The footer moves to the end of the last Home screen and the end of the Works results.
- Tablets and desktop keep normal page scrolling.

| What | Where |
|---|---|
| Behaviour | `src/lib/screen-deck.ts` (`mountDeck`, `watchScrollCue`, `dockFooter`) |
| Which screens are phones | `DECK_QUERY` in the same file, and the matching `@media (max-width: 767px) and (max-aspect-ratio: 1/1)` in `src/styles/arcade.css` |
| Home tab bar | `src/pages/index.astro`, the `<nav class="deck-tabs">` list of `[id, label]` pairs |
| Layout | `src/styles/arcade.css`, section "Phone deck" |

Add a Home screen

1. In `src/pages/index.astro`, add a `<section id="newid" class="detail-panel">...</section>` inside `<div class="scroll-portfolio" data-deck>`, before the comment "Phone deck chrome".
2. Add `['newid', 'Label']` to the list inside `<nav class="deck-tabs">`, in the same position.
3. Keep labels short (one word); the bar scrolls but short labels read better.

Rename or reorder tabs: edit the same list. The first value must match a section `id`.

Change the phone breakpoint: change it in both `DECK_QUERY` and every matching `@media` line in `arcade.css`. If they differ, tabs appear without the layout or the reverse.

Links such as `/#terms` open the matching screen, and a link to something inside a screen (for example `/#term-refunds`) opens that screen and scrolls to it. Section snapping on Home (`src/lib/home-scroll.ts`) switches itself off on phones; do not remove the `if (deck.matches) return;` lines there or touch scrolling inside screens will break.

Known limits: very short phones hide the hero art placeholder and the service descriptions so the first screens fit. Sideways phones use the normal scrolling page.

## 17. Not-found page

`src/pages/404.astro`. Shows a large "404" that flickers apart in the accent colours (still under reduced motion), the existing message, and buttons to Home, Works and Clients. The effect is in `src/styles/arcade.css` under "Not-found page". To change the buttons, edit the links in `404.astro`.

## 18. Removed in the redesign

Listed so nobody looks for them:

- The contact form and its notes (see section 10).
- Separate Editing and Web design sections on Home. They are now two tabs of one Pricing section (section 9).
- Nav links "Editing", "Web design" and the long "Meet the Clients!" label. The bar now has Pricing and Clients.
- `src/components/ServicePage.astro` (an older standalone pricing page nothing used).
- `src/lib/gallery-reveal.mjs` and `scripts/gallery-reveal.test.mjs` (maths for the old vertical client gallery).
- The cream "Paper & Stage" colours on public pages. The admin studio still uses them.
- The frosted blur on content cards (kept on the nav bar only), because it slowed scrolling on phones.
