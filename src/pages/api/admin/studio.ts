import type { APIRoute } from 'astro';
import { readStudioFiles, writeStudio } from '../../../lib/studio-store';
import type { StudioPayload } from '../../../lib/studio-shared';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async () => {
  try {
    return json(await readStudioFiles());
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not read the catalog.' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as StudioPayload;
    const mode = await writeStudio(body);
    return json({ ok: true, mode });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not save.' }, 400);
  }
};
