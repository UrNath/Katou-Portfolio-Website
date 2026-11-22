# Game-UI restyle: implementation notes

Source of truth for porting the approved mockup into the Astro site.
Mockup: https://claude.ai/artifact/Kpbm8jEiZKMKnAkFFLTfXp (private to the owner).
Mockup source: `docs/redesign/mockup-source.html` (images stripped; see "Rebuilding the mockup").

Base branch for the real work: `claude/cool-ptolemy-gus4m1` (the only branch with the Clients page,
`/about`, `/pricing`, iris page transition and the works profile view). `main` is older.

## Ground rules from the owner

- Keep the current site's foundation: page structure, sections, features, animations. This is a
  restyle of every element, not a new layout. New features only where listed below.
- Style direction: Zenless Zone Zero / Genshin character-select screens. Dark deck, one coloured
  diagonal slab per screen, italic condensed names, slanted tabs, skill diamonds, cross-hatch decals,
  halftone dots. No game logos, characters or copied art.
- Mobile layouts follow the OLD site's mobile proportions (compact), with the new skin.
- No NK logo mark anywhere in the page UI. The NK favicon/deploy icon stays for now.

## Design tokens (mockup `:root`)

| Token | Value | Use |
| --- | --- | --- |
| `--void` | `#0e1015` | page ground |
| `--deck` | `#161920` | section/panel ground |
| `--plate` / `--plate-2` | `#1f232c` / `#2a2f3a` | chips, tabs, inputs |
| `--line` | `#363c49` | hairlines |
| `--text` / `--mute` | `#eef1f6` / `#929aab` | text |
| `--signal` | `#c6f432` | active UI chrome (nav pill, active tabs, focus) |
| `--katou` | `#2f6fe0` | Katou brand blue (home slab, pricing/contact banners) |
| `--gold` | `#f3c443` | KATOU highlight, CTAs, prices |
| `--peach` | `#f4b590` | secondary CTA |
| `--hot` | `#ff5b34` | works slab, "don't take" chips |

Fonts (Google Fonts): Barlow Condensed 600/800/700i/800i/900i (names, headings, nav),
Barlow 400/500/600 (body), Chakra Petch 500/600/700 (UI labels, uppercase, tracked).

Client palettes (already in `src/data/clients.ts`): Pidgeira `#2b4378/#131d3a/#8fc8ff`,
Chi `#5a1622/#22070d/#ff6b78`, Miu `#27323a/#141b20/#a3f0db`.
Works profile banners: Pidgeira slab `#3f78e0` deep `#16295c`; Chi `#d23c55`/`#4a0f1b`; Miu `#21a58c`/`#0d3b35`.

## Global

- Header: wordmark only ("NASSU" white + "KATOU" blue), italic condensed nav, active page = skewed
  lime pill. Right side: Discord + YouTube diamonds, outlined skewed Contact button.
  Home only: second row of section tabs (Intro / Featured / About / Contact).
- Mobile: burger opens a slide-down sheet of slanted route rows with meta text + social diamonds + email.
- Social icons everywhere are the real brand logos (simple-icons paths) inside 45°-rotated diamond
  outlines. Footer adds an email diamond.
- Buttons: parallelogram (clip-path), hover lifts 2px with a light sweep; `overflow: hidden` so the
  sweep never leaks (bug seen in mockup v1).
- Page transition (replaces the stamp/iris one): three skewed bands sweep left to right (lime,
  destination colour with halftone, void with speed lines). The void band carries
  "LOADING · 0N" + the page name in huge italic with a coloured offset shadow. Old page scales to
  .97 and dims while covered. Swap at ~560 ms, total ~1.05 s. Page colours: home/pricing/contact blue,
  works orange, clients light blue, terms gold. Reduced motion: instant swap.
- Content rise: elements rise in with a stagger when a page opens.
- Animate on scroll: opt-in (`aos-ready` on `<html>` only when IntersectionObserver exists and motion
  is allowed). Fade + 28px rise, steps/terms items slide from the left, tiers rise with a slight skew.
  Re-arms each time a page is opened. Applied to: featured copy/carousel/CTA, about video + copy,
  contact band, works row heads, pricing heads/package/side/steps/tiers, contact cards/form,
  terms head + items, client socials, footer.
- Use `scale` / `translate` properties (not `transform`) for hover effects so they don't fight the
  scroll-reveal transform.

## Home

- Copy: label "Professor Number 67"; "Meet the editor!" then KATOU (gold slab, blue offset shadow);
  tags VIDEO EDITOR / UI/UX DEVELOPER / ★ COMMISSIONS OPEN; tagline
  "VTuber clip editor & creator web designer." (no "short-form").
- Skill diamonds: Editing (Open) and UI/UX Developer (Open) only. Thumbnails removed.
  No diamond is highlighted at rest; gold highlight only on hover / keyboard focus.
- Buttons: View works (white) + Contact (peach) → `/contact`. "Scroll to see my edits" cue.
- Art: Katou chibi on a tilted cut-corner card over the blue slab, outlined ghost "KATOU" behind,
  credit tag "ART ILLUST: MINGMING.IX". Desktop: copy left, art right.
  Mobile: art FIRST (top, ~240px wide) so it's visible on open, then compact copy; buttons side by side.
- Featured works: orange diagonal slab, "02 Featured", 3D carousel (centre card framed, lime play
  diamond), diamond pips. Title only under the carousel (no "Edit for … 01/05").
  Desktop keeps arrow buttons; mobile hides them and uses swipe.
- About: video placeholder styled as a viewfinder (REC, timecode, corner brackets).
  Stats: Edits + Turnaround only (client count removed on all sizes).
- Contact band: "Let's make something." with gold "something.", Contact button → `/contact`.

## Works

- Slim banner (~20% of the screen): kicker + "WORKS" left, search right, client chips below.
  Mobile: title + search on one row, chips below; Shorts and Long form rows must both be visible on open.
- Rows: Shorts (horizontal snap strip, arrow buttons on desktop), Long form (Vlogs / MVs / Normal tabs),
  Thumbnails. Desktop tiles 150px (wide 300px); mobile 112px (wide 220px).
- Client chips and video order are shuffled on every visit to Works.
- Picking a client = TikTok-style profile view (old site behaviour). The profile uses the SAME banner as
  the main Works view (same slab colour, same height: 96px title row + 44px tab row on desktop,
  46px + 40px on phone). Title row: back button, diamond avatar, name, handle (no counts), search on
  the right. Tab row (where the chips were): Shorts / Long form / Thumbnails slanted tabs (icons only
  on phone). Long form tab shows the Vlogs / MVs / Normal filter above the grid.
  Grid: 3 cols (5 on desktop), wide items 2 / 3 cols.
- Transition (View Transitions API, like the old site): header bar pinned; banner swaps instantly
  (identical); search glides (.85s); chip avatar -> profile avatar morph; title block <-> name cross-fade;
  chips row <-> tabs row fade/rise. Back button slides in from the left with a skew (.5s, .12s delay)
  and slides out the same way on return. Content uses the old site's animation: old slides out left
  (.38s), new fades up 28px (.6s, .42s delay). No per-tile morph. Fallback: fade-up.
- Client colour only on the avatar ring, handle, active-tab underline and grid hover outline
  (not on the banner).

## Meet the clients

- Character-select screen: switch row (client tabs + "⇄ Switch client" button on the RIGHT for thumb
  reach; mobile label "⇄ Switch"), huge italic name, tags (Type / Class / Element), quote,
  Highlights (3 reel diamonds with real clip posters) / Skins tabs, Main weapon, socials row.
  Art on the client's diagonal slab with outlined ghost name; avatar roster down the right edge
  (mobile: top-left column). No 01/03 counter.
- Quote style for descriptions: big italic in a dark plate with client-colour quote marks.
- Data updates:
  - Pidgeira: Class Marksman, Element Ice, Weapon "Ice bow and ice daggers",
    Discord `pidgeira`, quote "mao mao!".
  - Chi: Discord `chiseyi`, quote "arf pew pew ᶻ 𝗓 𐰁".
- Mobile: one screen, no scrolling (footer hidden on this page). Art area = 45% of the screen height;
  info compressed below (weapon becomes a tag, quote clamped).
- Switch animation: Persona-5-style cut-in, ~1.05 s, content swaps at ~430 ms:
  white flash; client-colour back plate with halftone + vertical speed lines and torn edges;
  black ink band with torn edges and fine lines; two white jagged slivers sliding the other way;
  portrait strip (white borders, black outline, colour offset shadow under it) panning the new art;
  two white/black stars popping; "NEXT UP!" black tag with white outline; ransom-note name
  (each letter its own box: paper / ink / client colour, mixed fonts, sizes and tilt).
  Reduced motion: instant swap.
  Size: a thin centred diagonal band, not full-screen. Desktop: back plate 46% of the screen height,
  ink band 32%, portrait strip 19%; phone: 34% / 24% / 15%. Name letters at 72% size.

## Pricing

- Slim banner (~20%) with Editing / Web design jump tabs.
- Editing fits one screen (desktop and mobile): head (title, Open, one-line description),
  package card left (stars, name, Real price tag, big gold price, 2×2 stats), right column:
  I take / I don't take chips, Add-ons, Commission button + "Read the Terms first".
- Package card has a top-right "⇄ MVs" button: card slides to an MV card (purple tint) and back.
  MV info is PLACEHOLDER: PHP 3,500 / MV, up to 4 minutes, YouTube 16:9, unlimited minor + 2 major,
  7 to 10 days, note "Sample MV info. Real MV pricing is still to be set."
- Web design: same compact head, Brief → Design → Build → Launch steps (4-up on mobile), tiers
  B / A (Popular) / S side by side on desktop, swipe row on mobile.
- Hover: chips grow (scale 1.08) with a lime (take) / orange (don't take) glow; add-on rows tint gold
  and indent; package card and tiers grow slightly with a coloured border; steps grow; stat rows
  underline gold.

## Contact (draft from old page)

- Slim banner "Say hi on Discord / CONTACT".
- Left: blue Discord card (Fastest way to reach me, "Message me on Discord", gold @nassukatou tag,
  Open Discord + Copy tag, status chips), "Before you write" list (from `contact.json`),
  email + Copy.
- Right: form (Name, Handle / channel, Service [Editing / Web design / Not sure yet], Links, Message),
  Email Katou button. Real site keeps the existing mailto draft behaviour.

## Terms (draft from old page)

- Slim banner "The details, up front / TERMS", "Before we begin." + subtitle + updated date.
- Accordion from `terms.json`: numbered diamond index, italic title, chevron. First item open.
- Smooth open/close: height + opacity animation (open 420 ms, close 320 ms), paragraphs stagger in,
  index diamond turns lime when open. Reduced motion: instant.

## Rebuilding the mockup

`mockup-source.html` has image placeholders (`{{katou}}`, `/*IMG*/{}`, `/*ICON*/{}`, `/*CLIPS*/[]`,
`{{SOC:name}}`). Images came from `src/assets/character/katou-chibi.webp`, `public/clients/*`,
`public/avatars/*` and `src/assets/posters/*` on the base branch; icons from `simple-icons`.

## Revision log

1. v1 restyle accepted as the direction.
2. Removed NK mark; UI/UX Developer; tagline; Professor Number 67; mobile layouts back to old proportions;
   hero art visible on open; featured arrows/meta removed on mobile; client count removed; logo diamonds;
   clients compact + switch on right; compact pricing banner.
3. Works profile view + avatar morph + shuffle; clients no counter, one-screen mobile with 45% art;
   Persona cut-in; pricing 20% banner, editing in one view, MV card; home highlight on hover only,
   no Thumbnails; Contact + Terms drafts.
4. Connected works morph + per-client banners; richer cut-in texture (ransom name, stars, torn bands);
   client data (Pidgeira, Chi); animate on scroll; pricing hovers; smooth terms accordion;
   new page transition.
5. Works profile: no counts, Long form keeps Vlogs/MVs/Normal, same banner as main Works, old content
   animation, back button in/out animation.
6. Thinner centred cut-in band.
