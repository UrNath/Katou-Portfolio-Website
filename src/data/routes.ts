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
      meta: 'Shorts, long form & thumbnails',
      icon: 'film',
      primary: true,
    },
    {
      href: '/pricing',
      label: 'Pricing',
      meta: 'Editing & web design',
      icon: 'scissors',
    },
    { href: '/clients', label: 'Meet the Clients!', meta: 'Creators I edit for', icon: 'film' },
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
