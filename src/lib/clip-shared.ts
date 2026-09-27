export interface ViewerClip {
  id: string;
  title: string;
  creator: string;
  channelHandle: string;
  creatorId: string;
  duration: string;
  tags: string[];
  poster: string;
  previewSrc?: string;
  youtube: string;
  tiktok: string | null;
  wide: boolean;
  heroFeatured: boolean;
}

/** Pull a YouTube id only from a real watch, shorts, or youtu.be URL. */
export function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') {
      id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/shorts/')) {
        id = parsed.pathname.split('/')[2] ?? '';
      } else {
        id = parsed.searchParams.get('v') ?? '';
      }
    }
    return /^[\w-]{6,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Numeric id from a tiktok.com /@user/video/{id} URL. */
export function tiktokId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.replace(/^www\./, '') !== 'tiktok.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const index = parts.indexOf('video');
    const id = index >= 0 ? (parts[index + 1] ?? '') : '';
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

/** Credit line on every card. The handle already includes "@". */
export function editCredit(channelHandle: string): string {
  const handle = channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`;
  return `Edit for ${handle}`;
}
