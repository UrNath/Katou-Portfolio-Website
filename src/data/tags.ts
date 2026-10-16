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

const layoutTags = Array.isArray(layout.tags) ? layout.tags : null;

const seen = new Map<string, { id: string; label: string }>();
const remember = (label: string) => {
  const id = tagSlug(label);
  if (!id || seen.has(id)) return;
  seen.set(id, { id, label });
};
if (layoutTags) {
  for (const label of layoutTags) remember(label);
} else {
  for (const clip of clips) {
    for (const label of clip.tags) remember(label);
  }
}

/** Works filter chips. The studio list is the whole set, including a tag no video uses yet. An empty list shows no chips. */
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

/** Each filter dimension is independent. Existing ?creator= and ?tag= links still work. */
export type WorkType = 'short' | 'long' | 'thumbnail';
export interface WorkFilters {
  creator: string;
  tag: string;
  type: WorkType | '';
}

const workTypes: WorkType[] = ['short', 'long', 'thumbnail'];

export function filterFromSearch(params: URLSearchParams): WorkFilters {
  const creator = params.get('creator') ?? '';
  const tag = params.get('tag') ?? '';
  const type = params.get('type') ?? '';
  return {
    creator: isCreatorId(creator) ? creator : '',
    tag: isClipTag(tag) ? tag : '',
    type: workTypes.includes(type as WorkType) ? type as WorkType : '',
  };
}

export function filterHref(filters: WorkFilters, query = ''): string {
  const params = new URLSearchParams();
  if (filters.creator) params.set('creator', filters.creator);
  if (filters.type) params.set('type', filters.type);
  if (filters.tag) params.set('tag', filters.tag);
  const text = query.trim();
  if (text) params.set('q', text);
  const search = params.toString();
  return search ? `/works?${search}` : '/works';
}

/** Independently hide non-matching cards before hydration, without losing combined selections. */
export function filterCss(): string {
  const rules: string[] = [];
  for (const creator of creators) {
    rules.push(
      `html[data-creator-filter="${creator.id}"] .clip-card:not([data-creator="${creator.id}"]){display:none}`,
    );
  }
  for (const tag of clipTags) {
    rules.push(
      `html[data-tag-filter="${tag.id}"] .clip-card:not([data-tags~="${tag.id}"]){display:none}`,
    );
  }
  for (const type of workTypes) {
    rules.push(
      `html[data-type-filter="${type}"] .clip-card:not([data-content-type="${type}"]){display:none}`,
    );
  }
  return rules.join('\n');
}

/** Set each selected dimension before first paint, including combined URL filters. */
export function filterBoot(): string {
  const creatorIds = creators.map((creator) => creator.id);
  const tagIds = clipTags.map((tag) => tag.id);
  return `(()=>{var p=new URLSearchParams(location.search);
    var c=p.get("creator")||"",t=p.get("tag")||"",y=p.get("type")||"";
    if(${JSON.stringify(creatorIds)}.includes(c))document.documentElement.setAttribute("data-creator-filter",c);
    if(${JSON.stringify(tagIds)}.includes(t))document.documentElement.setAttribute("data-tag-filter",t);
    if(["short","long","thumbnail"].includes(y))document.documentElement.setAttribute("data-type-filter",y);
  })();`;
}
