import type { APIContext, APIRoute } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { githubOAuthConfigured, readSession } from '../../../lib/admin-session';
import { readStudioFiles } from '../../../lib/studio-store';

export const prerender = false;

const repo = 'UrNath/Katou-Portfolio-Website';
const MAX_BYTES = 5 * 1024 * 1024;
const allowedFormats = new Set(['jpeg', 'png', 'webp']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function tokenFor(cookies: APIContext['cookies'], request: Request): Promise<string> {
  if (githubOAuthConfigured()) {
    const session = await readSession(cookies);
    return session?.token ?? '';
  }
  return process.env.ADMIN_GITHUB_TOKEN?.trim() || request.headers.get('x-admin-token')?.trim() || '';
}

async function publishPoster(rel: string, bytes: Buffer, token: string): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'nassukatou-editor',
  };
  const url = `https://api.github.com/repos/${repo}/contents/${rel}`;
  const existing = await fetch(`${url}?ref=main`, { headers });
  if (existing.status !== 404 && !existing.ok) {
    throw new Error('GitHub could not verify the existing thumbnail file.');
  }
  const current = existing.ok ? (await existing.json()) as { sha?: string } : null;
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Update portfolio poster ${path.basename(rel)}`,
      content: bytes.toString('base64'),
      branch: 'main',
      ...(current?.sha ? { sha: current.sha } : {}),
    }),
  });
  if (!response.ok) throw new Error('GitHub could not save the thumbnail. Check repository write permissions.');
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = await tokenFor(cookies, request);
  if (process.env.VERCEL && !token) return json({ error: 'Sign in or connect a GitHub token to upload thumbnails.' }, 401);
  if (githubOAuthConfigured() && !token) return json({ error: 'Sign in with GitHub to upload thumbnails.' }, 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Invalid upload origin.' }, 403);

  try {
    const data = await request.formData();
    const id = String(data.get('clipId') ?? '');
    const file = data.get('file');
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(id)) {
      return json({ error: 'Invalid video id.' }, 400);
    }
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) {
      return json({ error: 'Upload a PNG, JPEG or WebP smaller than 5 MB.' }, 400);
    }

    const studio = await readStudioFiles(token);
    if (!studio.clips.some((clip) => clip.id === id)) {
      return json({ error: 'This video is not in the catalog.' }, 404);
    }
    const clip = studio.clips.find((item) => item.id === id)!;
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 20_000_000, animated: false });
    const meta = await image.metadata();
    if (!meta.format || !allowedFormats.has(meta.format) || !meta.width || !meta.height) {
      return json({ error: 'Unsupported image. Use PNG, JPEG or WebP.' }, 400);
    }
    const wide = clip.orientation === 'landscape';
    const output = await image
      .rotate()
      .resize(wide ? 960 : 540, wide ? 540 : 960, { fit: 'cover', position: 'centre' })
      .webp({ quality: 76, effort: 4 })
      .toBuffer();

    const rel = `public/media/posters/${id}.webp`;
    if (process.env.VERCEL) {
      await publishPoster(rel, output, token);
    } else {
      const absolute = path.join(process.cwd(), rel);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, output);
    }
    return json({ ok: true, url: `/media/posters/${id}.webp` });
  } catch (reason) {
    return json({ error: reason instanceof Error ? reason.message : 'Thumbnail upload failed.' }, 400);
  }
};
