import type { APIRoute } from 'astro';
import { adminHtml, githubOAuthConfigured, newState, publicOrigin, writeStateCookie } from '../../../lib/admin-session';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
  if (!githubOAuthConfigured()) {
    return adminHtml(
      'GitHub sign-in is not set up',
      '<p>This deploy still saves with the token already connected. Sign-in starts after <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> are added in Vercel and the site is redeployed.</p><p><a href="/admin">Back to the studio</a></p>',
    );
  }
  const origin = publicOrigin(request, url);
  if (!origin) {
    return adminHtml(
      'This address cannot sign in',
      '<p>GitHub sign-in is only allowed on the live site and on local development.</p>',
      400,
    );
  }
  const state = newState();
  writeStateCookie(cookies, state, new URL(origin));
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!.trim());
  authorize.searchParams.set('redirect_uri', `${origin}/api/admin/github/callback`);
  authorize.searchParams.set('scope', 'repo');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('allow_signup', 'false');
  return redirect(authorize.toString());
};
