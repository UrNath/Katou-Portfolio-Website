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

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nassukatou-editor',
    'Content-Type': 'application/json',
  };
}

async function githubText(rel: string, token: string): Promise<string | null> {
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${rel}?ref=main`, {
    headers: githubHeaders(token),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('GitHub refused that token. It needs permission to edit this repo.');
    }
    throw new Error(`GitHub could not read ${rel}.`);
  }
  const body = (await response.json()) as { content?: string };
  if (!body.content) return null;
  return Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

/** One commit for every file that changed, so Works cannot rebuild from a half-saved catalog. */
async function githubCommit(bodies: Record<string, string>, token: string): Promise<void> {
  const changed: { path: string; content: string }[] = [];
  for (const [rel, content] of Object.entries(bodies)) {
    const existing = await githubText(rel, token);
    if (existing !== null && sameDoc(existing, content)) continue;
    changed.push({ path: rel, content });
  }
  if (changed.length === 0) return;

  const headers = githubHeaders(token);
  const refResponse = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/main`, { headers });
  if (!refResponse.ok) throw new Error('GitHub could not read the main branch.');
  const ref = (await refResponse.json()) as { object?: { sha?: string } };
  const parent = ref.object?.sha;
  if (!parent) throw new Error('GitHub could not read the main branch.');

  const commitResponse = await fetch(`https://api.github.com/repos/${repo}/git/commits/${parent}`, { headers });
  if (!commitResponse.ok) throw new Error('GitHub could not read the main branch.');
  const commit = (await commitResponse.json()) as { tree?: { sha?: string } };
  const baseTree = commit.tree?.sha;
  if (!baseTree) throw new Error('GitHub could not read the main branch.');

  const treeEntries = [];
  for (const file of changed) {
    const blobResponse = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      }),
    });
    if (!blobResponse.ok) throw new Error(`GitHub rejected ${file.path}.`);
    const blob = (await blobResponse.json()) as { sha?: string };
    if (!blob.sha) throw new Error(`GitHub rejected ${file.path}.`);
    treeEntries.push({ path: file.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha });
  }

  const treeResponse = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseTree, tree: treeEntries }),
  });
  if (!treeResponse.ok) throw new Error('GitHub rejected the save.');
  const tree = (await treeResponse.json()) as { sha?: string };
  if (!tree.sha) throw new Error('GitHub rejected the save.');

  const names = changed.map((file) => file.path.split('/').pop()).join(', ');
  const nextResponse = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: `Update ${names} from the editor`,
      tree: tree.sha,
      parents: [parent],
    }),
  });
  if (!nextResponse.ok) throw new Error('GitHub rejected the save.');
  const next = (await nextResponse.json()) as { sha?: string };
  if (!next.sha) throw new Error('GitHub rejected the save.');

  const updated = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/main`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: next.sha }),
  });
  if (!updated.ok) {
    const detail = await updated.text();
    throw new Error(`GitHub rejected the save: ${detail.slice(0, 280)}`);
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
    await githubCommit(bodies, token);
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
