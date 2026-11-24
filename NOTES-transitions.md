# Page-transition mockups: notes for later

## Artifacts
- Main (all pages, Clients entrance intentionally blank): https://claude.ai/artifact/1KibmKPomrwN1A6HWpxiAf (v3)
- Clients special transition: https://claude.ai/artifact/3SasPSoJhtJ2eSfRfXMqRx (v1)
- Both are fixed 1904x952 stages scaled to fit, with no instruction text.

## Pending: rework the Clients transition (feedback)
1. Replace the "CLIENTS" ransom-note announcement card. Do not show an announcement or any text.
   Make it a pure animation/transition instead.
2. Remove the obvious Persona 5 references: the red/black/white palette, the red star,
   and the ransom-note lettering. Keep the energy (fast, bold, sliced shapes), not the look.
3. Keep the ZZZ-flavoured ideas that are not tied to P5, e.g. glitch/channel split, scanlines,
   static, tear bars. Pick a palette from the site itself (blues #2f6fe0 / #2b4378 / #131d3a,
   lime #c6f432, gold #f3c443) so it reads as this site's own.
4. Structure to keep: cover -> swap under the cover -> reveal, then the Clients entrance
   (name slams down, art cuts in from the right, tags/quote/tabs/strip slide in, reels and socials rise),
   all using motion + scale. Same cover mirrored when leaving Clients.
5. The Clients page layout matches the live preview (diamond reels, strip y=756, socials y=819).

## Other pending
- Redesign PNGs for the Editing and Web design pages matching the Pricing page look. User said "later".
- Clients entrance in the main artifact stays blank (user's instruction); the special one lives in the second artifact.

## Source of truth / constraints
- Latest live preview: https://nassukatou-site-6rq0v380l-ano19.vercel.app (share link was given in chat).
- Newest repo branch with the navbar fix: origin/katou/nifty-pasteur-rsp1om.
- Navbar: keep exact real spacing so pill, diamonds and Contact never overlap
  (Home 944.9/98.2, Works 1043.1/113, Clients 1156.1/125.9, Pricing 1282/122.5, Terms 1404.5/109.6,
  diamonds 1530.3 and 1600.3, Contact 1672.8/156.8).
- Transition mechanics came from yejji.net (Swup + clip-path, 1s, cubic-bezier(.76,0,.24,1)).
- Pricing page design is liked; keep it as is.

## Build files (scratchpad, may be cleared)
build2.py -> build3.py (Contact) -> build4.py (Clients special), test with Playwright clock stepping.
Scratchpad: /tmp/claude-0/-home-user-Katou-Portfolio-Website/0a2f0e9b-3fc6-5056-af8c-826a2914071f/scratchpad/
