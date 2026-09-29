import type { APIRoute } from 'astro';
import {
  adminHtml,
  clearAdminCookies,
  githubOAuthConfigured,
  isOwner,
  publicOrigin,
  readState,
  sealSession,
  statesMatch,
  writeSessionCookie,
} from '../../../../lib/admin-session';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
  if (!githubOAuthConfigured()) return redirect('/api/admin/login');
  const origin = publicOrigin(request, url);
  if (!origin) {
    return adminHtml('This address cannot sign in', '<p>GitHub sign-in is only allowed on the live site and on local development.</p>', 400);
  }
  const page = new URL(origin);
  const code = url.searchParams.get('code')?.trim() ?? '';
  const state = url.searchParams.get('state') ?? '';
  const expected = readState(cookies);
  if (!code || !statesMatch(expected, state)) {
    clearAdminCookies(cookies, page);
    return adminHtml(
      'Sign-in did not finish',
      '<p>GitHub sign-in did not match this browser. <a href="/api/admin/login">Try again</a>.</p>',
      400,
    );
  }
  clearAdminCookies(cookies, page);
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'nassukatou-editor',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!.trim(),
      client_secret: process.env.GITHUB_CLIENT_SECRET!.trim(),
      code,
      redirect_uri: `${origin}/api/admin/github/callback`,
      state,
    }),
  });
  const tokenBody = (await tokenResponse.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenResponse.ok || !tokenBody.access_token) {
    const mismatch = tokenBody.error === 'redirect_uri_mismatch';
    return adminHtml(
      'GitHub did not sign you in',
      mismatch
        ? '<p>The callback URL on the GitHub OAuth app does not match this site. Add <code>https://nassukatou-site.vercel.app/api/admin/github/callback</code>, then <a href="/api/admin/login">try again</a>.</p>'
        : '<p>GitHub did not return a sign-in. <a href="/api/admin/login">Try again</a>.</p>',
      400,
    );
  }
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenBody.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'nassukatou-editor',
    },
  });
  const user = (await userResponse.json().catch(() => ({}))) as { login?: string };
  if (!userResponse.ok || !user.login || !isOwner(user.login)) {
    return adminHtml('This studio is private', '<p>Only the GitHub account UrNath can open the studio.</p>', 403);
  }
  const sealed = await sealSession({ token: tokenBody.access_token, login: user.login });
  writeSessionCookie(cookies, sealed, page);
  return redirect('/admin');
};
