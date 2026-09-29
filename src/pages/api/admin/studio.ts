import type { APIRoute } from 'astro';
import { readStudioFiles, writeStudio } from '../../../lib/studio-store';
import type { StudioPayload } from '../../../lib/studio-shared';

export const prerender = false;

function tokenFrom(request: Request): string {
  return request.headers.get('x-admin-token')?.trim() ?? '';
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const provided = tokenFrom(request);
  const saveMode = process.env.VERCEL && !(provided || process.env.ADMIN_GITHUB_TOKEN) ? 'needs-token' : 'ok';
  try {
    return json(await readStudioFiles(provided), 200, { 'x-studio-save': saveMode });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not read the catalog.' }, 500, {
      'x-studio-save': saveMode,
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as StudioPayload;
    const mode = await writeStudio(body, tokenFrom(request));
    return json({ ok: true, mode });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not save.' }, 400);
  }
};
