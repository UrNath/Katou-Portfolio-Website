/** Data shaped for the public pages (layouts/Site.astro and src/pages). */
import type { ClipRecord } from './clips';

export const cleanTitle = (title: string) => title.replace(/\s*#\S+/g, '').replace(/\s{2,}/g, ' ').trim() || title;

/** Attributes that make an element open the video player (lib/site.ts). */
export function playAttrs(clip: ClipRecord) {
  return {
    'data-play': '',
    'data-title': cleanTitle(clip.title),
    'data-yt': clip.youtube,
    'data-tt': clip.tiktok ?? undefined,
    'data-private': clip.youtubePrivate ? 'true' : undefined,
    'data-preview': clip.previewSrc,
    'data-poster': clip.poster,
    'data-wide': clip.wide ? 'true' : undefined,
  };
}

/** Client chips on Works and the profile banner colours. */
export const creatorLook: Record<string, { avatar: string; acc: string }> = {
  pidgeira: { avatar: '/avatars/pidge.webp', acc: '#8fc8ff' },
  chiseyi: { avatar: '/avatars/chi.webp', acc: '#ff6b78' },
  miu: { avatar: '/avatars/miu.webp', acc: '#a3f0db' },
};
