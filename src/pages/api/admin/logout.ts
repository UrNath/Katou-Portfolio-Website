import type { APIRoute } from 'astro';
import { clearAdminCookies, publicOrigin } from '../../../lib/admin-session';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
  const origin = publicOrigin(request, url);
  clearAdminCookies(cookies, origin ? new URL(origin) : url);
  return redirect('/admin/signed-out');
};
