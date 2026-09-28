import type { StatusKey } from './status';

export interface RouteItem {
  href: string;
  label: string;
  meta: string;
  icon: 'film' | 'scissors' | 'code-xml' | 'file-text' | 'mail';
  primary?: boolean;
  statusKey?: StatusKey;
}

/** Hub and menu routes. Prices come from the service content files. */
export function getRoutes(prices: { editing: string; web: string }): RouteItem[] {
  return [
    {
      href: '/works',
      label: 'Works',
      meta: '9:16 Shorts & TikTok',
      icon: 'film',
      primary: true,
    },
    {
      href: '/editing',
      label: 'Editing',
      meta: `from ${prices.editing} per short`,
      icon: 'scissors',
      statusKey: 'editing',
    },
    {
      href: '/web-design',
      label: 'Web design',
      meta: `Creator sites from ${prices.web}`,
      icon: 'code-xml',
      statusKey: 'webDesign',
    },
    {
      href: '/terms',
      label: 'Terms',
      meta: 'Read before a commission',
      icon: 'file-text',
    },
    {
      href: '/contact',
      label: 'Contact',
      meta: 'Email or form',
      icon: 'mail',
    },
  ];
}
