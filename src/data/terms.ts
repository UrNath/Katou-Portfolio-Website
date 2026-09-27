export interface TermSection {
  id: string;
  title: string;
  paragraphs: string[];
}

/**
 * Sample terms and FAQ. Not a real policy.
 * Replace the paragraphs before taking bookings.
 * `/terms#refunds` opens the payment section.
 */
export const termsSections: TermSection[] = [
  {
    id: 'general',
    title: 'General',
    paragraphs: [
      'These are sample terms for the portfolio build. They are not a contract and not legal advice.',
      'Katou edits short-form vertical clips and designs small sites for creators. A request is reviewed. It is not first-come, first-served.',
      'Older sample clips on this site are placeholders. They do not represent a finished client list.',
    ],
  },
  {
    id: 'editing',
    title: 'Editing',
    paragraphs: [
      'Editing covers short-form 9:16 clips for YouTube Shorts and TikTok: highlights, karaoke cuts, collabs, and subtitled versions, within the scope on the Editing page.',
      'Send footage you have the right to use. Unlicensed replays, NSFW or shock content, and rushes under 48 hours are out of scope in this sample.',
      'PHP 1,000 covers one short up to 1 minute, for YouTube Shorts or TikTok (9:16), with unlimited minor revisions, 2 major revisions, and a 1 to 3 day turnaround. What counts as minor or major is a draft in the Revisions section.',
    ],
  },
  // TODO: Katou must confirm this draft. Minor means caption and typo fixes, small timing tweaks, or a sound or SFX swap. Major means re-cutting or restructuring the clip or changing the concept.
  {
    id: 'revisions',
    title: 'Revisions',
    paragraphs: [
      'DRAFT. Katou has not confirmed this definition yet.',
      'A Short edit includes unlimited minor revisions and 2 major revisions.',
      'Minor means caption and typo fixes, small timing tweaks, or a sound or SFX swap.',
      'Major means re-cutting or restructuring the clip, or changing the concept.',
    ],
  },
  {
    id: 'web-design',
    title: 'Web design',
    paragraphs: [
      'Web design covers a mobile-first page or a small creator site, designed and built as a static site. This portfolio is a sample of that work.',
      'Stores, checkout, and full web apps are out of scope in this sample.',
      'The process on the Web design page is Brief, then Design, then Build, then Launch.',
    ],
  },
  {
    id: 'refunds',
    title: 'Payment & refunds',
    paragraphs: [
      'Payment and refund language is a placeholder. Replace this section before anyone pays.',
      'No amount, deposit, or refund window is stated here on purpose. Do not invent one in the page layout. Edit this file.',
    ],
  },
  {
    id: 'turnaround',
    title: 'Turnaround',
    paragraphs: [
      'A Short edit has a 1 to 3 day turnaround.',
      'A booked edit starts when the footage and notes are both in. Waiting on files pauses the clock.',
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    paragraphs: [
      'How do I send a project? Use the contact form. It opens an email draft to the sample address. Nothing is stored on a server.',
      'Will my name appear on a clip? Only if you add it. Each card is credited as “Edit for” plus the creator’s handle.',
      'Can I book while a service says Closed? The button becomes “Join the waitlist”. Waitlist still uses the normal booking label.',
      'Where do I change prices, status, or clips? See CONTENT.md in the project root.',
    ],
  },
];
