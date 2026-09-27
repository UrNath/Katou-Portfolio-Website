import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import rawClips from '../data/clips.json';
import hubOrder from '../data/hub-order.json';
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

/**
 * Not Katou's edits. Dropped in cursor/remove-uncredited-works-f0de.
 * Filtered here as well so a later merge cannot put them back on the site.
 */
const OMITTED_CLIP_IDS = new Set(['miu-ms25', 'miu-mv1', 'miu-mv40', 'pidge-p6']);

function clipEntries(raw: unknown): unknown[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && 'clips' in raw ? (raw as { clips: unknown }).clips : null;
  if (!Array.isArray(list)) throw new Error('clips.json must be a list, or { clips: [] }.');
  return list.filter((item) => {
    const id = item && typeof item === 'object' && item !== null && 'id' in item ? String((item as { id: unknown }).id) : '';
    return !OMITTED_CLIP_IDS.has(id);
  });
}

async function buildClips(): Promise<ClipRecord[]> {
  const parsed = z.array(clipSchema).parse(clipEntries(rawClips));
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
export function hubClips(clips: ClipRecord[]): ClipRecord[] {
  const featured = new Map(clips.filter((clip) => clip.featured).map((clip) => [clip.id, clip]));
  const ordered: ClipRecord[] = [];
  for (const id of hubOrder.order) {
    if (OMITTED_CLIP_IDS.has(id)) continue;
    const clip = featured.get(id);
    if (clip) ordered.push(clip);
  }
  for (const clip of featured.values()) {
    if (!ordered.some((item) => item.id === clip.id)) ordered.push(clip);
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
