import layout from '../data/works-layout.json';
import rawThumbnails from '../data/thumbnails.json';
import type { ClipRecord } from './clips';
import { slugify, type SectionKind, type StudioSection, type StudioThumbnail } from './studio-shared';

export interface WorkSection {
  id: string;
  label: string;
  kind: SectionKind;
}

export const workSections = layout.sections as WorkSection[];
export const workCreators = layout.creators as { id: string; label: string }[];

export const longFormCategories = [
  { id: 'vlogs', label: 'Vlogs' },
  { id: 'mvs', label: 'MVs' },
  { id: 'normal', label: 'Normal Videos' },
] as const;

/**
 * Gallery entries can reference an existing edited video's real optimized poster
 * via "clip:<id>". Override their image in Studio without copying image assets.
 */
export function loadThumbnails(clips: ClipRecord[]): StudioThumbnail[] {
  const clipMap = new Map(clips.map((clip) => [clip.id, clip]));
  const items = (Array.isArray(rawThumbnails) ? rawThumbnails : []) as StudioThumbnail[];
  return items.map((thumb) => {
    const linked = thumb.image.startsWith('clip:') ? clipMap.get(thumb.image.slice(5)) : null;
    return { ...thumb, image: linked?.poster ?? (thumb.image.startsWith('clip:') ? '/og.png' : thumb.image) };
  });
}

export function creatorIdOf(name: string): string {
  return slugify(name);
}

/** Clips land in an explicit section, or in the first short / long section. */
export function clipsInSection(section: StudioSection, clips: ClipRecord[]): ClipRecord[] {
  const vertical = workSections.find((item) => item.kind === 'vertical');
  const landscape = workSections.find((item) => item.kind === 'landscape');
  return clips.filter((clip) => {
    if (clip.section && workSections.some((item) => item.id === clip.section && item.kind !== 'thumbnail')) {
      return clip.section === section.id;
    }
    if (section.kind === 'custom' || section.kind === 'thumbnail') return false;
    const fallback = clip.wide ? landscape?.id : vertical?.id;
    return fallback === section.id;
  });
}
