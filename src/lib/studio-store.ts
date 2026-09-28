import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeStudio, type StudioPayload } from './studio-shared';

const repo = 'UrNath/Katou-Portfolio-Website';

const files = {
  clips: 'src/data/clips.json',
  hubOrder: 'src/data/hub-order.json',
  layout: 'src/data/works-layout.json',
  thumbnails: 'src/data/thumbnails.json',
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

async function readLocal(rel: string): Promise<unknown> {
  const text = await readFile(path.join(process.cwd(), rel), 'utf8');
  return JSON.parse(text);
}

export async function readStudioFiles(): Promise<StudioPayload> {
  const clipsFile = (await readLocal(files.clips)) as { clips?: StudioPayload['clips'] } | StudioPayload['clips'];
  const clips = Array.isArray(clipsFile) ? clipsFile : (clipsFile.clips ?? []);
  const hub = (await readLocal(files.hubOrder)) as { order?: string[] };
  const layout = (await readLocal(files.layout)) as Pick<StudioPayload, 'creators' | 'sections'>;
  const thumbnails = (await readLocal(files.thumbnails)) as StudioPayload['thumbnails'];
  const hero = clips.find((clip) => clip.heroFeatured)?.id ?? hub.order?.[0] ?? clips[0]?.id ?? '';
  return {
    clips,
    order: hub.order ?? [],
    heroId: hero,
    creators: layout.creators ?? [],
    sections: layout.sections ?? [],
    thumbnails: Array.isArray(thumbnails) ? thumbnails : [],
  };
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

export async function writeStudio(input: StudioPayload): Promise<'local' | 'github'> {
  const next = normalizeStudio(input);
  const bodies: Record<string, string> = {
    [files.clips]: dump({ clips: next.clips }),
    [files.hubOrder]: dump(next.hubOrder),
    [files.layout]: dump(next.layout),
    [files.thumbnails]: dump(next.thumbnails),
  };
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (process.env.VERCEL && token) {
    for (const [rel, content] of Object.entries(bodies)) {
      await githubPut(rel, content, token);
    }
    return 'github';
  }
  if (process.env.VERCEL && !token) {
    throw new Error('This deploy cannot save yet. Add ADMIN_GITHUB_TOKEN in Vercel, then redeploy.');
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
