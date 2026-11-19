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

## 7. Home page and sample carousel (`/`)

What it does: five full-screen sections in the Poster C look. In order: hero with the character card, featured carousel, Works / Pricing switch, About teaser, Contact band (then the footer).

Files

| What | Where |
|---|---|
| Page layout and its small scripts | `src/pages/index.astro` |
| All Poster C colours, sizes and motion | `src/styles/poster.css` |
| Character image file | `src/assets/character/katou-chibi.webp` |
| Character on/off, alt text, artist credit, location tag | `src/data/site.ts` (`characterArt`, `location`) |
| Tagline and About sentence | `src/data/site-settings.json` (`role`, `description`) |
| Carousel layout and behaviour | `src/components/FeaturedCarousel.astro`, `src/lib/featured-carousel.ts` |
| Which clips are in the carousel | `/admin`, Home reel (saved to `src/data/hub-order.json`) |
| Paged card strips | `src/lib/poster-rows.ts` |

Hero

- Headline: in `index.astro`, the `<h1 id="intro-title">` line. The word inside `<span>` gets the gold block.
- Character: replace `katou-chibi.webp` with a new cut-out (one figure, transparent background, about 700 × 880). Keep the file name, or change the `import chibi` line in `index.astro`.
- Credit: `characterArt.artist` in `site.ts`. It prints as "ART ILLUST: NAME" under the card. Do not remove the credit while this art is used.
- To hide the character and credit, set `characterArt.enabled` to `false`.
- Card size: in `poster.css`, the `--card` values in the `.pc-hero` rules. The character is always 110% of the card height.
- The "Play highlight reel" button and the two status chips read the same data as before (`/admin` Home reel, `src/data/status.json`).

Carousel: five samples, three in view, loops forever. Arrows, the dots, Left / Right keys, and swipe all move it; one move takes 450 ms (the number `450` in `featured-carousel.ts`). The centre sample plays its preview on hover or tap. With reduced motion it switches instantly.

Works / Pricing switch

- Two tabs change the panel in place. Left / Right keys move between tabs.
- Works tab: a strip of real work in two rows that scrolls sideways inside its box. Chips filter it (All, Short-form, Long form videos, Thumbnails). How many of each: the three `.slice(0, 4)` lines near the top of `index.astro`.
- Pricing tab: one card per service with its title and subtitle from `src/content/services/`. No prices are shown here by design; the cards and the button go to `/pricing`.

About teaser: the photo is a marked placeholder (`data-placeholder="about-photo"`). Replace that `<div class="pc-photo">` with an image when one exists. The button goes to `/about` (section 15).

Contact band: heading and a button to `/contact`.

Fit to screen: each section is exactly as tall as the visible screen below the nav bar (`.pc-fit` in `poster.css`), so nothing is cut off. On very short screens (under 600 px tall) sections grow instead and the page scrolls normally. Do not give a section a fixed pixel height.

Motion: cards tilt on hover with a mouse and press in on touch; sections fade up once as they scroll into view; background blobs drift. All of it is off with reduced motion (last block of `poster.css`).

## 8. Works page and filters (`/works`)

What it does: on a white page, a "Works" title and search, a lane under the nav bar with icon links (Shorts, Long Form, Thumbnails) and a row of creator chips, then one full-screen section per content type. Picking a creator chip opens that creator's profile view (neutral initial avatar, name, handle and counts taken from the real clips) with icon tabs for Short, Long form and Thumbnails; the Back icon returns to all works. On phones the search bar is sticky next to the Back icon; focusing it expands and darkens it.

Files

| What | Where |
|---|---|
| Page layout, search and tab scripts | `src/pages/works.astro` |
| Filter chips, profile view, transitions | `src/islands/WorksFilters.tsx`, `src/data/tags.ts` |
| Whole-chip paging (‹ › when chips do not fit) | `src/lib/works-chips.ts` |
| Content-type icons | `src/components/WorkTypeIcon.astro` |
| Videos | `src/data/clips.json` (edit in `/admin`) |
| Thumbnails gallery | `src/data/thumbnails.json` (edit in `/admin`) |
| Creators, sections, tags | `src/data/works-layout.json` (edit in `/admin`) |
| One video card | `src/components/ClipCard.astro` |
| Thumbnail viewer | `src/islands/ThumbnailViewer.tsx` |
| Paged card strips | `src/lib/poster-rows.ts` |
| Look | `src/styles/poster.css`, "Works page" block |

Kept from before: title and works count; search by title or client; Content filter (All types, Short Form, Long Form, Thumbnails); VTuber filter (All creators plus one chip per creator); filters and search combine and are stored in the page address, so a filtered view can be shared; duration badges; hover-to-play with a mouse and tap on touch; "Edit for @..." credit on video cards; the thumbnail viewer.

Changed or added

- Sections stack down the page like the wireframe. Each has a row that scrolls sideways and snaps to whole cards (6 short columns on desktop, 4 on tablet, 3 on phones; long form 3/2/1; thumbnails 4/3/2; a creator's page uses 2 rows). A thin bar under each row shows position, with round ‹ › buttons beside the title on desktop only. The page never scrolls sideways.
- Title and "Edit for @..." credit sit under each card (shorts hide the caption on phones).
- Long Form Videos: Vlogs, MVs and Normal Videos are tabs; one group shows at a time. A group with no matching videos loses its tab. Left / Right keys move between tabs.
- A gold number next to each section title shows how many items match.
- "Clear filters" appears in the filter bar when any filter or search is on. When nothing matches, a message and a Clear filters button show instead of the sections.
- Thumbnail viewer: Previous / Next buttons, a counter, and Left / Right keys. Esc or the X closes it. It moves through the thumbnails that currently match the filters.
- Creator profile: shows only data that exists (handle from the creator's clips, counts of shorts/long-form/thumbnails). There is no bio or avatar photo in the data, so none is shown; the avatar is an initial. Open tab defaults to the creator's first type that has work; the URL `type` param overrides it.
- Enter/leave uses the View Transitions API (chip circle becomes the avatar); it is skipped with reduced motion or when unsupported.
- Removed: the fanned-shorts title decoration and the blue title banner.

How to change things

- Rows per strip: in `poster.css`, the `--rows` values under "Paged rows" (`.pc-rows-tall` is Shorts, `.pc-rows-wide` is Long Form and Thumbnails).
- Section names: `sections` in `src/data/works-layout.json`. Long Form group names: `longFormCategories` in `src/lib/works-layout.ts`.
- A video's Long Form group: its `longFormCategory` in `clips.json` (`vlogs`, `mvs` or `normal`), or in `/admin`.

Do not rename the `data-*` attributes in `works.astro` (`data-filter-kind`, `data-rows`, `data-lf-tab`, `data-block-count`, and so on). The scripts find elements by them.

Thumbnails carry no "Edit for" line on purpose: the gallery note says design credit may vary.

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

Current links: Home, Works, Clients, Pricing, Terms, Contact. The last link in the list gets the outlined shape; `SiteBar.astro` picks it by its address `/contact`.

Links: `src/data/site.ts`, array `navLinks` (`href`, `label`). Phone menu routes: `src/data/routes.ts`. The tab look (uppercase labels, slanted block on the current page) is at the end of `src/styles/scroll-portfolio.css` under "Tab-style navigation". A page can recolour it by setting `--nav-accent`; Meet the Clients does this with the current client's colour.

## 13. Opening curtain

`src/components/SiteIntro.astro`. On Home it shows once per browser session. On Meet the Clients it lifts when the first client's art has loaded. It is skipped with reduced motion.

## 14. Admin and content management

- `/admin` (the studio): videos, home reel, client chips, sections, thumbnails, tags, Terms. Sign-in is GitHub, UrNath account only. Saving commits to GitHub and Vercel rebuilds.
- `/keystatic`: prices, status, contact notes, Terms.
- Setup steps and the names of the required environment variables are in `README.md`. Values are never stored in the repo.
- The studio does not edit `src/data/clients.ts`. Meet the Clients facts are changed by hand as in section 1.

Do not touch `src/middleware.ts`, `src/pages/api/admin/`, or `src/lib/admin-session.ts` unless you are fixing sign-in. A mistake there locks the editor.

## 15. Poster C look, and the Pricing, Terms, Contact and About pages

Look: every page except Meet the Clients and `/admin` uses `src/styles/poster.css`. The colours are the first block of that file (eye blue, hair brown, peach, tie gold, jacket slate). Change a value there and it changes everywhere. Headings use Bowlby One, body text Outfit, the nav bar Geist.

Measured text contrast (WCAG AA needs 4.5): white on blue 5.0, brown on peach 9.2, brown on gold 9.0, white on slate 6.4, white on brown 14.6, muted brown on white 9.4, blue "Katou" on the nav bar 4.9. If you change a colour, re-check the pair it is used with.

Pages

| Address | File | Content comes from |
|---|---|---|
| `/pricing` | `src/pages/pricing.astro` | Section 9 files. Editing is at `/pricing#editing`, Web design at `/pricing#web-design` |
| `/terms` | `src/pages/terms.astro` | Section 11 |
| `/contact` | `src/pages/contact.astro` | Section 10. `/contact?service=editing` preselects a service |
| `/about` | `src/pages/about.astro` | `description` in `site-settings.json`, plus a marked placeholder |
| `/editing`, `/web-design` | forward to the two `/pricing` addresses | `src/components/SectionRedirect.astro` |

Pricing, Terms and Contact used to be sections of the home page. They are pages now, so the old home addresses `/#editing`, `/#web-design`, `/#terms` and `/#commission` no longer exist.

About page: the dashed box is a placeholder (`data-placeholder="about-copy"`). Replace that paragraph with real text. Do not invent experience or achievements. The About page is linked from the home About teaser but is not in the nav bar; add `{ href: '/about', label: 'About' }` to `navLinks` in `src/data/site.ts` if it should be.

Known limits: Pricing, Terms and Contact hold long content and scroll; they are not one-screen pages. The About photo and About text are placeholders. The Discord link in `site-settings.json` should be confirmed.

## Update: Works, Home, Contact (Nov 20)
- Works creator view scrolls down as a feed (no sideways rows); format tabs only for formats that creator has, with names beside icons on desktop; no "works shown" chip or jump icons; Back/search animate without clipping; no shared-element avatar flight; thumbnails split by aspect ratio (16:9 / 9:16); Pidge and Chi avatars in `public/avatars/`.
- Home: location removed everywhere; hero scroll cue replaces the highlight-reel button; avatar slide-up; carousel without arrows, larger on phones; Works/Pricing section removed ("See all works" in Featured); About shows a placeholder video (set `site.aboutVideo` in `src/data/site.ts`).
- Contact leads with the Discord tag `nassukatou` (open + copy); email form kept below.
- Meet the Clients no longer plays the opening curtain.

## Update: round 3 (Nov 20)
- Works: avatar morph (chip to profile picture) restored; the static `clip-<id>` view-transition name on hero-featured cards (floating video) removed; work counts removed from profiles; sliding highlight (`.nk-ind`, placed in `WorksFilters.tsx` `placeIndicators`) for format tabs, tag chips and the long-form groups.
- Home: Featured works headline and a highlighted "See all works" button at the bottom; About button removed.
- Contact: socials row removed (footer has them), Discord card slimmed.
- Menu: Editing and Web design merged into one Pricing button. Pricing: "Prices updated" removed; editing page notes long-form and normal videos (no new prices).
- Pidge clips carry `youtubePrivate: true` in clips.json: the viewer uses TikTok only. Clips without a `tiktokUrl` show the fallback until a link is added.

## Round 4
- Home Featured Works on phones (≤899px) follows the mobile wireframe: 58%-width centre card, tilted side cards, caption under cards, 5 dots, gold "See all works" button with a blue pulse ring. Finger-following swipe with flick momentum.
- Works: empty thumbnail groups are hidden so Thumbnails starts at the same offset as Shorts.
- `src/lib/flick.ts`: mouse/pen flick-and-glide for every sideways scroller; touch coasts natively (soft snapping `x proximity`).

## Round 5
- Featured section is its own stacking context and clips its cards, so they stay under the sticky header.
- Works rows get the carousel's depth motion on phones (cards shrink/tilt/drop toward the edges); skipped for reduced motion.
- Works tab highlights are rounded sliding pills (content tabs and Vlogs/MVs/Normal).
- New NK logo: `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`.

## Round 6
- Works rows: depth motion reverted; only the flick/momentum remains.
- Navbar on every page now uses the clients-page frosted-glass bar (translucent + blur + hairline), in the light Poster palette.

## Round 7
- Works content tabs: back to a small rounded line under the icon.
- Flick/momentum now also handles touch (rows set `touch-action: pan-y`), so All-works Shorts/Thumbnails coast with the flick speed.
- Menu: Works no longer has the yellow primary highlight.
- Home intro curtain: the hero's entrance animations wait (`html.intro-wait`) until the curtain starts lifting.

## Round 8: phone density (≤768px)
- Tokens in `poster.css`: `--pc-bw` (outline width, 3px → 2px), `--pc-k` (radius/solid-shadow scale, 1 → .62), `--pc-pad` 16px; all Poster borders, radii and shadows now use them. Desktop values unchanged.
- Phone block at the end of `poster.css` (and one for Meet the Clients in `scroll-portfolio.css`): bar 52px, wordmark 17px, headings 18-26px, body 15px, buttons/chips/inputs 40-42px, smaller hero art, cards and tighter section padding.
- Featured carousel card width capped at 50% of the screen on phones.
