import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import rawClips from '../data/clips.json';
import { site } from '../data/site';
import { tagSlug } from '../data/tags';
import { formatDuration, type ViewerClip } from './clip-shared';

export type { ViewerClip } from './clip-shared';

const posters = import.meta.glob<{ default: ImageMetadata }>('../assets/posters/*.webp', { eager: true });

const clipSchema = z.object({
  id: z.string(),
  creator: z.string(),
  channelHandle: z.string(),
  title: z.string(),
  youtubeUrl: z.string().url(),
  tiktokUrl: z.string().url().nullable(),
  uploadDate: z.string(),
  durationSec: z.number(),
  orientation: z.enum(['vertical', 'landscape']),
  aspectRatio: z.string(),
  poster: z.string(),
  preview: z.string(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  heroFeatured: z.boolean(),
});

export interface ClipRecord extends ViewerClip {
  featured: boolean;
  posterImage: ImageMetadata;
}

function posterFor(file: string): ImageMetadata {
  const base = file.split('/').pop();
  const found = Object.entries(posters).find(([key]) => key.endsWith(`/${base}`));
  if (!found) throw new Error(`Missing poster for ${file}. Expected src/assets/posters/${base}.`);
  return found[1].default;
}

function previewUrl(file: string): string {
  const base = file.split('/').pop() ?? file;
  const root = site.previewBase.replace(/\/$/, '');
  return root ? `${root}/${base}` : `/media/previews/${base}`;
}

let cached: Promise<ClipRecord[]> | undefined;

export function loadClips(): Promise<ClipRecord[]> {
  cached ??= buildClips();
  return cached;
}

async function buildClips(): Promise<ClipRecord[]> {
  const parsed = z.array(clipSchema).parse(rawClips);
  const heroes = parsed.filter((clip) => clip.heroFeatured);
  if (heroes.length !== 1) {
    throw new Error(`Expected one heroFeatured clip, found ${heroes.length}.`);
  }

  return Promise.all(
    parsed.map(async (clip) => {
      const posterImage = posterFor(clip.poster);
      const wide = clip.orientation === 'landscape';
      const image = await getImage({
        src: posterImage,
        width: wide ? 960 : 540,
        format: 'webp',
      });
      return {
        id: clip.id,
        title: clip.title,
        creator: clip.creator,
        channelHandle: clip.channelHandle,
        creatorId: clip.creator.toLowerCase(),
        duration: formatDuration(clip.durationSec),
        tags: clip.tags.map((tag) => tagSlug(tag)),
        poster: image.src,
        posterImage,
        previewSrc: previewUrl(clip.preview),
        youtube: clip.youtubeUrl,
        tiktok: clip.tiktokUrl,
        wide,
        featured: clip.featured,
        heroFeatured: clip.heroFeatured,
      } satisfies ClipRecord;
    }),
  );
}

export function toViewerClip(clip: ClipRecord): ViewerClip {
  return {
    id: clip.id,
    title: clip.title,
    creator: clip.creator,
    channelHandle: clip.channelHandle,
    creatorId: clip.creatorId,
    duration: clip.duration,
    tags: clip.tags,
    poster: clip.poster,
    previewSrc: clip.previewSrc,
    youtube: clip.youtube,
    tiktok: clip.tiktok,
    wide: clip.wide,
    heroFeatured: clip.heroFeatured,
  };
}

/**
 * Hub content is featured-only by design. Miu stays on /works, newest first,
 * and does not appear in the hero, the dimmed neighbors, the Works thumbnails,
 * or the hub viewer. Order is Katou's, not the catalog order.
 */
export const HUB_FEATURED_ORDER = [
  'chi-c3',
  'chi-c4',
  'pidge-p7',
  'pidge-p8',
  'pidge-p3',
] as const;

export function hubClips(clips: ClipRecord[]): ClipRecord[] {
  const featured = new Map(clips.filter((clip) => clip.featured).map((clip) => [clip.id, clip]));
  const ordered = HUB_FEATURED_ORDER.map((id) => {
    const clip = featured.get(id);
    if (!clip) throw new Error(`Featured hub clip ${id} is missing from clips data.`);
    return clip;
  });
  const extras = [...featured.keys()].filter(
    (id) => !HUB_FEATURED_ORDER.includes(id as (typeof HUB_FEATURED_ORDER)[number]),
  );
  if (extras.length > 0) {
    throw new Error(`Hub is featured-only. Unexpected featured clips: ${extras.join(', ')}.`);
  }
  return ordered;
}

/** Center clip is heroFeatured. Previous and next walk the featured list only. */
export function heroReel(clips: ClipRecord[]): {
  hero: ClipRecord;
  prev: ClipRecord;
  next: ClipRecord;
  position: number;
  total: number;
} {
  const pool = hubClips(clips);
  const hero = pool.find((clip) => clip.heroFeatured);
  if (!hero) throw new Error('The hub hero must be one of the featured clips.');
  const index = pool.findIndex((clip) => clip.id === hero.id);
  const prev = pool[(index - 1 + pool.length) % pool.length] ?? hero;
  const next = pool[(index + 1) % pool.length] ?? hero;
  return { hero, prev, next, position: index + 1, total: pool.length };
}
