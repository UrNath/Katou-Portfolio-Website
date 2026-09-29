import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import clipsBundled from '../data/clips.json';
import hubBundled from '../data/hub-order.json';
import layoutBundled from '../data/works-layout.json';
import thumbsBundled from '../data/thumbnails.json';
import termsBundled from '../data/terms.json';
import { normalizeStudio, type StudioPayload, type StudioTerm } from './studio-shared';

const repo = 'UrNath/Katou-Portfolio-Website';

const files = {
  clips: 'src/data/clips.json',
  hubOrder: 'src/data/hub-order.json',
  layout: 'src/data/works-layout.json',
  thumbnails: 'src/data/thumbnails.json',
  terms: 'src/data/terms.json',
} as const;

function dump(value: unknown): string {
  const json = JSON.stringify(value, null, 2).replace(/[\u007f-\uffff]/g, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
  return `${json}\n`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) out[key] = canonicalize(item);
    }
    return out;
  }
  return value;
}

function sameDoc(current: string, next: string): boolean {
  try {
    return JSON.stringify(canonicalize(JSON.parse(current))) === JSON.stringify(canonicalize(JSON.parse(next)));
  } catch {
    return false;
  }
}

function termsOf(file: unknown): StudioTerm[] {
  const raw = file as { sections?: StudioTerm[] };
  return Array.isArray(raw?.sections) ? raw.sections : [];
}

function toPayload(
  clipsFile: unknown,
  hubFile: unknown,
  layoutFile: unknown,
  thumbsFile: unknown,
  termsFile: unknown,
): StudioPayload {
  const clipsRaw = clipsFile as { clips?: StudioPayload['clips'] } | StudioPayload['clips'];
  const clips = Array.isArray(clipsRaw) ? clipsRaw : (clipsRaw.clips ?? []);
  const hub = hubFile as { order?: string[] };
  const layout = layoutFile as Pick<StudioPayload, 'creators' | 'sections' | 'tags'>;
  const thumbnails = thumbsFile as StudioPayload['thumbnails'];
  const hero = clips.find((clip) => clip.heroFeatured)?.id ?? hub.order?.[0] ?? clips[0]?.id ?? '';
  const fromClips = clips.flatMap((clip) => (Array.isArray(clip.tags) ? clip.tags.map(String) : []));
  return {
    clips,
    order: hub.order ?? [],
    heroId: hero,
    creators: layout.creators ?? [],
    sections: layout.sections ?? [],
    thumbnails: Array.isArray(thumbnails) ? thumbnails : [],
    terms: termsOf(termsFile),
    tags: Array.isArray(layout.tags) ? layout.tags : fromClips,
  };
}

/** The catalog shipped with this deploy. Vercel does not keep src/data on disk. */
function bundledPayload(): StudioPayload {
  return toPayload(clipsBundled, hubBundled, layoutBundled, thumbsBundled, termsBundled);
}

async function readLocal(rel: string): Promise<unknown> {
  const text = await readFile(path.join(process.cwd(), rel), 'utf8');
  return JSON.parse(text);
}

async function githubGet(rel: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${rel}?ref=main`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'nassukatou-editor',
    },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('GitHub refused that token. It needs permission to edit this repo.');
    }
    throw new Error(`GitHub could not read ${rel}.`);
  }
  const body = (await response.json()) as { content?: string };
  if (!body.content) throw new Error(`GitHub could not read ${rel}.`);
  return JSON.parse(Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf8'));
}

export async function readStudioFiles(githubToken = ''): Promise<StudioPayload> {
  const token = githubToken.trim();
  if (process.env.VERCEL && token) {
    try {
      return toPayload(
        await githubGet(files.clips, token),
        await githubGet(files.hubOrder, token),
        await githubGet(files.layout, token),
        await githubGet(files.thumbnails, token),
        await githubGet(files.terms, token),
      );
    } catch {
      return bundledPayload();
    }
  }
  if (process.env.VERCEL) return bundledPayload();
  try {
    return toPayload(
      await readLocal(files.clips),
      await readLocal(files.hubOrder),
      await readLocal(files.layout),
      await readLocal(files.thumbnails),
      await readLocal(files.terms),
    );
  } catch (error) {
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    if (missing) return bundledPayload();
    throw error;
  }
}

async function githubPut(rel: string, content: string, token: string): Promise<void> {
  const url = `https://api.github.com/repos/${repo}/contents/${rel}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nassukatou-editor',
    'Content-Type': 'application/json',
  };
  const current = await fetch(`${url}?ref=main`, { headers });
  let sha: string | undefined;
  if (current.ok) {
    const body = (await current.json()) as { sha?: string; content?: string };
    sha = body.sha;
    if (body.content) {
      const existing = Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf8');
      if (sameDoc(existing, content)) return;
    }
  }
  const saved = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Update ${rel} from the editor`,
      content: Buffer.from(content).toString('base64'),
      branch: 'main',
      sha,
    }),
  });
  if (!saved.ok) {
    const detail = await saved.text();
    throw new Error(`GitHub rejected ${rel}: ${detail.slice(0, 280)}`);
  }
}

export async function writeStudio(input: StudioPayload, githubToken = ''): Promise<'local' | 'github'> {
  const next = normalizeStudio(input);
  const bodies: Record<string, string> = {
    [files.clips]: dump({ clips: next.clips }),
    [files.hubOrder]: dump(next.hubOrder),
    [files.layout]: dump(next.layout),
    [files.thumbnails]: dump(next.thumbnails),
    [files.terms]: dump(next.terms),
  };
  const token = githubToken.trim();
  if (process.env.VERCEL && token) {
    for (const [rel, content] of Object.entries(bodies)) {
      await githubPut(rel, content, token);
    }
    return 'github';
  }
  if (process.env.VERCEL && !token) {
    throw new Error('This live site cannot save until you connect a GitHub token.');
  }
  for (const [rel, content] of Object.entries(bodies)) {
    const full = path.join(process.cwd(), rel);
    let existing = '';
    try {
      existing = await readFile(full, 'utf8');
    } catch {
      existing = '';
    }
    if (existing && sameDoc(existing, content)) continue;
    await writeFile(full, content);
  }
  return 'local';
}
