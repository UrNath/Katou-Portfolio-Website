import settings from './site-settings.json';

/** Site-wide identity. Email and social URLs come from site-settings.json. */
export const site = {
  name: 'NassuKatou',
  shortName: 'Katou',
  email: settings.email,
  role: settings.role,
  description: settings.description,
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
  previewBase: settings.previewBase,
};

export type SocialId = 'discord' | 'youtube' | 'tiktok' | 'x';

export interface SocialLink {
  id: SocialId;
  label: string;
  href: string;
}

export const socials: SocialLink[] = settings.socials.map((item) => ({
  id: item.id as SocialId,
  label: item.label,
  href: item.href,
}));

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
