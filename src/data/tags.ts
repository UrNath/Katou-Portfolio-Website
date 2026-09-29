import rawClips from './clips.json';
import layout from './works-layout.json';

interface ClipMeta {
  id?: string;
  tags: string[];
  creator: string;
}

const omittedClipIds = new Set(['miu-ms25', 'miu-mv1', 'miu-mv40', 'pidge-p6']);
const clipList = (Array.isArray(rawClips) ? rawClips : rawClips.clips) as ClipMeta[];
const clips = clipList.filter((clip) => !omittedClipIds.has(clip.id ?? ''));

export function tagSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const layoutTags = Array.isArray(layout.tags) ? layout.tags : [];

const seen = new Map<string, { id: string; label: string }>();
for (const label of layoutTags) {
  const id = tagSlug(label);
  if (!id || seen.has(id)) continue;
  seen.set(id, { id, label });
}
for (const clip of clips) {
  for (const label of clip.tags) {
    const id = tagSlug(label);
    if (!id || seen.has(id)) continue;
    seen.set(id, { id, label });
  }
}

/** Works filter chips. Layout order wins, including a tag that no video uses yet. */
export const clipTags = [...seen.values()];

/** Creator chips, in the order set in the editor, including a new client with no videos yet. */
export const creators = layout.creators;

export type ClipTagId = (typeof clipTags)[number]['id'];

export function isClipTag(value: string): boolean {
  return clipTags.some((tag) => tag.id === value);
}

export function isCreatorId(value: string): boolean {
  return creators.some((creator) => creator.id === value);
}

/** One active filter. A creator query wins when both are present. */
export function filterFromSearch(params: URLSearchParams): string {
  const creator = params.get('creator') ?? '';
  const tag = params.get('tag') ?? '';
  if (isCreatorId(creator)) return `creator:${creator}`;
  if (isClipTag(tag)) return tag;
  return '';
}

export function filterHref(filter: string): string {
  if (!filter) return '/works';
  if (filter.startsWith('creator:')) return `/works?creator=${encodeURIComponent(filter.slice('creator:'.length))}`;
  return `/works?tag=${encodeURIComponent(filter)}`;
}

/** Hide non-matching cards before paint, and hide a section whose cards are all hidden. */
export function filterCss(): string {
  const rules: string[] = [];
  const add = (filter: string, match: string) => {
    rules.push(
      `html[data-filter="${filter}"] .clip-card:not(${match}){display:none}`,
      `html[data-filter="${filter}"] .works-block:not(:has(${match})){display:none}`,
    );
  };
  for (const tag of clipTags) add(tag.id, `.clip-card[data-tags~="${tag.id}"]`);
  for (const creator of creators) add(`creator:${creator.id}`, `.clip-card[data-creator="${creator.id}"]`);
  return rules.join('\n');
}

export function filterBoot(): string {
  const creatorIds = creators.map((creator) => creator.id);
  const tagIds = clipTags.map((tag) => tag.id);
  return `(()=>{var p=new URLSearchParams(location.search);var c=p.get("creator")||"";var t=p.get("tag")||"";var cs=${JSON.stringify(creatorIds)};var ts=${JSON.stringify(tagIds)};var f="";if(c&&cs.indexOf(c)!==-1)f="creator:"+c;else if(t&&ts.indexOf(t)!==-1)f=t;if(f)document.documentElement.setAttribute("data-filter",f);})();`;
}
