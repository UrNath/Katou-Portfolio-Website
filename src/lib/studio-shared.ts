export const OMITTED_CLIP_IDS = ['miu-ms25', 'miu-mv1', 'miu-mv40', 'pidge-p6'] as const;

const omitted = new Set<string>(OMITTED_CLIP_IDS);

export type SectionKind = 'vertical' | 'landscape' | 'thumbnail' | 'custom';

export interface StudioCreator {
  id: string;
  label: string;
}

export interface StudioSection {
  id: string;
  label: string;
  kind: SectionKind;
}

export interface StudioThumbnail {
  id: string;
  creator: string;
  channelHandle: string;
  title: string;
  image: string;
  videoUrl: string;
}

export interface StudioClip extends Record<string, unknown> {
  id: string;
  creator: string;
  channelHandle: string;
  title: string;
  youtubeUrl: string;
  tiktokUrl: string | null;
  orientation: 'vertical' | 'landscape';
  aspectRatio?: string;
  type?: string;
  posterUrl?: string;
  featured: boolean;
  heroFeatured: boolean;
  section?: string;
}

export interface StudioTerm {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface StudioPayload {
  clips: StudioClip[];
  order: string[];
  heroId: string;
  creators: StudioCreator[];
  sections: StudioSection[];
  thumbnails: StudioThumbnail[];
  terms: StudioTerm[];
  /** Works filter chips, in display order. Labels, not slugs. */
  tags: string[];
}

export function slugify(value: string): string {
  const id = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return id.slice(0, 48);
}

function isHttp(value: string): boolean {
  return value.startsWith('https://') || value.startsWith('http://');
}

function kindOf(value: unknown): SectionKind {
  if (value === 'landscape' || value === 'thumbnail' || value === 'custom' || value === 'vertical') return value;
  return 'custom';
}

function normalizeTerms(input: StudioTerm[] | undefined): StudioTerm[] {
  const terms: StudioTerm[] = [];
  const ids = new Set<string>();
  for (const raw of input ?? []) {
    const title = String(raw?.title ?? '').trim();
    if (!title) continue;
    let id = slugify(String(raw?.id ?? '')) || slugify(title);
    if (!id) continue;
    if (ids.has(id)) {
      let n = 2;
      while (ids.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    ids.add(id);
    const paragraphs = (Array.isArray(raw?.paragraphs) ? raw.paragraphs : [])
      .map((paragraph) => String(paragraph ?? '').trim())
      .filter(Boolean);
    if (paragraphs.length === 0) continue;
    terms.push({ id, title, paragraphs });
  }
  if (terms.length === 0) throw new Error('Keep at least one terms section.');
  return terms;
}

function tagLabelsFrom(raw: unknown): string[] {
  const labels: string[] = [];
  const ids = new Set<string>();
  const list = Array.isArray(raw) ? raw : [];
  for (const item of list) {
    const label = String(item ?? '').trim();
    const id = slugify(label);
    if (!label || !id || ids.has(id)) continue;
    ids.add(id);
    labels.push(label);
  }
  return labels;
}

export function normalizeStudio(input: StudioPayload): {
  clips: StudioClip[];
  hubOrder: { order: string[] };
  layout: { creators: StudioCreator[]; sections: StudioSection[]; tags: string[] };
  thumbnails: StudioThumbnail[];
  terms: { sections: StudioTerm[] };
} {
  const seen = new Set<string>();
  const clips: StudioClip[] = [];
  for (const raw of input.clips ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw.id ?? '').trim();
    if (!id || omitted.has(id) || seen.has(id)) continue;
    const title = String(raw.title ?? '').trim();
    const youtubeUrl = String(raw.youtubeUrl ?? '').trim();
    if (!title || !isHttp(youtubeUrl)) continue;
    const creator = String(raw.creator ?? '').trim() || 'Untitled';
    const orientation = raw.orientation === 'landscape' ? 'landscape' : 'vertical';
    const aspectRatio =
      raw.orientation === orientation && typeof raw.aspectRatio === 'string' && raw.aspectRatio
        ? raw.aspectRatio
        : orientation === 'landscape'
          ? '16:9'
          : '9:16';
    const type =
      raw.orientation === orientation && typeof raw.type === 'string' && raw.type
        ? raw.type
        : orientation === 'landscape'
          ? 'video'
          : 'short';
    const tiktok = typeof raw.tiktokUrl === 'string' && isHttp(raw.tiktokUrl) ? raw.tiktokUrl : null;
    const section = typeof raw.section === 'string' ? raw.section.trim() : '';
    seen.add(id);
    const next: StudioClip = { ...raw };
    next.id = id;
    next.title = title;
    next.creator = creator;
    next.channelHandle = String(raw.channelHandle ?? '').trim() || '@unknown';
    next.youtubeUrl = youtubeUrl;
    next.tiktokUrl = tiktok;
    next.orientation = orientation;
    next.aspectRatio = aspectRatio;
    next.type = type;
    next.featured = false;
    next.heroFeatured = false;
    if (section) next.section = section;
    else delete next.section;
    clips.push(next);
  }
  if (clips.length === 0) throw new Error('Keep at least one video on Works.');

  const creators: StudioCreator[] = [];
  const creatorIds = new Set<string>();
  for (const raw of input.creators ?? []) {
    const label = String(raw?.label ?? '').trim();
    if (!label) continue;
    let id = slugify(String(raw?.id ?? '')) || slugify(label);
    if (!id || creatorIds.has(id)) continue;
    creatorIds.add(id);
    creators.push({ id, label });
  }
  if (creators.length === 0) creators.push({ id: 'client', label: 'Client' });

  const sections: StudioSection[] = [];
  const sectionIds = new Set<string>();
  for (const raw of input.sections ?? []) {
    const label = String(raw?.label ?? '').trim();
    let id = slugify(String(raw?.id ?? '')) || slugify(label);
    if (!label || !id || sectionIds.has(id)) continue;
    sectionIds.add(id);
    sections.push({ id, label, kind: kindOf(raw?.kind) });
  }
  if (!sections.some((section) => section.kind === 'vertical')) {
    sections.unshift({ id: 'shorts', label: 'Shorts', kind: 'vertical' });
  }
  if (!sections.some((section) => section.kind === 'landscape')) {
    const at = sections.findIndex((section) => section.kind !== 'vertical');
    const row: StudioSection = { id: 'longer', label: 'Longer edits', kind: 'landscape' };
    if (at === -1) sections.push(row);
    else sections.splice(at, 0, row);
  }
  if (!sections.some((section) => section.kind === 'thumbnail')) {
    sections.push({ id: 'thumbnails', label: 'Thumbnails', kind: 'thumbnail' });
  }

  const knownSections = new Set(sections.filter((section) => section.kind !== 'thumbnail').map((section) => section.id));
  const tags = Array.isArray(input.tags)
    ? tagLabelsFrom(input.tags)
    : tagLabelsFrom(clips.flatMap((clip) => (Array.isArray(clip.tags) ? clip.tags : [])));
  const tagById = new Map(tags.map((label) => [slugify(label), label]));
  for (const clip of clips) {
    if (clip.section && !knownSections.has(clip.section)) clip.section = undefined;
    const rawTags = Array.isArray(clip.tags) ? clip.tags : [];
    const nextTags: string[] = [];
    const seenTags = new Set<string>();
    for (const tag of rawTags) {
      const id = slugify(String(tag));
      const label = tagById.get(id);
      if (!label || seenTags.has(id)) continue;
      seenTags.add(id);
      nextTags.push(label);
    }
    clip.tags = nextTags;
  }

  const byId = new Map(clips.map((clip) => [clip.id, clip]));
  const order: string[] = [];
  for (const id of input.order ?? []) {
    if (byId.has(id) && !order.includes(id)) order.push(id);
  }
  let heroId = String(input.heroId ?? '');
  if (!byId.has(heroId)) heroId = order[0] ?? clips.find((clip) => clip.heroFeatured)?.id ?? clips[0].id;
  if (!order.includes(heroId)) order.unshift(heroId);
  for (const id of order) {
    const clip = byId.get(id);
    if (!clip) continue;
    clip.featured = true;
    clip.heroFeatured = id === heroId;
  }

  const thumbnails: StudioThumbnail[] = [];
  const thumbIds = new Set<string>();
  for (const raw of input.thumbnails ?? []) {
    const title = String(raw?.title ?? '').trim();
    const image = String(raw?.image ?? '').trim();
    const videoUrl = String(raw?.videoUrl ?? '').trim();
    const creator = String(raw?.creator ?? '').trim();
    if (!title || !creator || !isHttp(image) || !isHttp(videoUrl)) continue;
    let id = slugify(String(raw?.id ?? '')) || slugify(title);
    if (!id || thumbIds.has(id)) id = `${id || 'thumb'}-${thumbIds.size + 1}`;
    thumbIds.add(id);
    thumbnails.push({
      id,
      creator,
      channelHandle: String(raw?.channelHandle ?? '').trim(),
      title,
      image,
      videoUrl,
    });
  }

  return {
    clips,
    hubOrder: { order },
    layout: { creators, sections, tags },
    thumbnails,
    terms: { sections: normalizeTerms(input.terms) },
  };
}
