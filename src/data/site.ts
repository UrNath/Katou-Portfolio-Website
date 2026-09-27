/** Site-wide identity and placeholder contact points. */
export const site = {
  name: 'NassuKatou',
  shortName: 'Katou',
  email: 'hello@nassukatou.example',
  role: 'Short-form VTuber clip editor & creator web designer.',
  description:
    'Katou edits short-form vertical VTuber clips and designs portfolio sites for creators. This is a sample portfolio.',
  /**
   * Optional character art on the stage banner. Off until human-drawn art exists.
   * No AI-generated art and no third-party characters.
   */
  characterArt: {
    enabled: false,
    src: null as string | null,
    alt: '',
    artist: '',
  },
  /**
   * Preview loops are served from /media/previews/ until this is a CDN origin
   * (no trailing slash), for example a Vercel Blob base URL. See CONTENT.md.
   */
  previewBase: '',
};

export type SocialId = 'youtube' | 'tiktok' | 'x';

export interface SocialLink {
  id: SocialId;
  label: string;
  /** TODO: replace "#" with the real profile URL. */
  href: string;
}

export const socials: SocialLink[] = [
  { id: 'youtube', label: 'YouTube', href: '#' },
  { id: 'tiktok', label: 'TikTok', href: '#' },
  { id: 'x', label: 'X', href: '#' },
];

export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/works', label: 'Works' },
  { href: '/editing', label: 'Editing' },
  { href: '/web-design', label: 'Web design' },
  { href: '/terms', label: 'Terms' },
  { href: '/contact', label: 'Contact' },
] as const;

export function isCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return path === href;
}

export function isPlaceholder(href: string): boolean {
  return href === '#' || href === '';
}
