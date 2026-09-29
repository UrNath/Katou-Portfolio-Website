import type { APIContext, APIRoute } from 'astro';
import { githubOAuthConfigured, readSession } from '../../../lib/admin-session';
import { readStudioFiles, writeStudio } from '../../../lib/studio-store';
import type { StudioPayload } from '../../../lib/studio-shared';

export const prerender = false;

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

/** Session token when GitHub sign-in is on. Otherwise the server token, then a browser token. */
async function tokenFor(cookies: APIContext['cookies'], request: Request): Promise<string> {
  if (githubOAuthConfigured()) {
    const session = await readSession(cookies);
    return session?.token ?? '';
  }
  const provided = request.headers.get('x-admin-token')?.trim() ?? '';
  return process.env.ADMIN_GITHUB_TOKEN?.trim() || provided;
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const oauth = githubOAuthConfigured();
  const token = await tokenFor(cookies, request);
  if (oauth && !token) return json({ error: 'Sign in with GitHub to open the studio.' }, 401);
  const saveMode = process.env.VERCEL && !token ? 'needs-token' : 'ok';
  try {
    return json(await readStudioFiles(token), 200, { 'x-studio-save': saveMode });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not read the catalog.' }, 500, {
      'x-studio-save': saveMode,
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const oauth = githubOAuthConfigured();
  const token = await tokenFor(cookies, request);
  if (oauth && !token) return json({ error: 'Sign in with GitHub to save.' }, 401);
  try {
    const body = (await request.json()) as StudioPayload;
    const mode = await writeStudio(body, token);
    return json({ ok: true, mode });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not save.' }, 400);
  }
};
