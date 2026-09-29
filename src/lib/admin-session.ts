import { timingSafeEqual } from 'node:crypto';
import type { APIContext } from 'astro';

const owner = 'UrNath';
const sessionCookie = 'nk_admin';
const stateCookie = 'nk_oauth_state';
const sessionSeconds = 60 * 60 * 24 * 14;
const stateSeconds = 60 * 10;

const allowedOrigins = new Set([
  'https://nassukatou-site.vercel.app',
  'http://127.0.0.1:4321',
  'http://localhost:4321',
]);

export type AdminSession = { token: string; login: string };

type Cookies = APIContext['cookies'];

export function githubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim());
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.GITHUB_CLIENT_SECRET?.trim() || '';
}

/** Only the live site and local dev may start or finish GitHub sign-in. */
export function publicOrigin(request: Request, url: URL): string | null {
  if (allowedOrigins.has(url.origin)) return url.origin;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost ?? '').split(',')[0]?.trim() ?? '';
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto = (forwardedProto ?? '').split(',')[0]?.trim() ?? '';
  if (!host || !proto) return null;
  const origin = `${proto}://${host}`;
  return allowedOrigins.has(origin) ? origin : null;
}

function cookieOptions(url: URL, maxAge: number) {
  return {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function bytesToB64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export async function sealSession(session: AdminSession): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error('Missing session secret.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(session))),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return bytesToB64(packed);
}

export async function openSession(value: string): Promise<AdminSession | null> {
  const secret = sessionSecret();
  if (!secret || !value) return null;
  try {
    const packed = new Uint8Array(Buffer.from(value, 'base64url'));
    if (packed.length < 13) return null;
    const iv = packed.slice(0, 12);
    const cipher = packed.slice(12);
    const key = await aesKey(secret);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    const parsed = JSON.parse(new TextDecoder().decode(plain)) as Partial<AdminSession>;
    if (!parsed.token || !parsed.login) return null;
    if (!isOwner(parsed.login)) return null;
    return { token: parsed.token, login: parsed.login };
  } catch {
    return null;
  }
}

export async function readSession(cookies: Cookies): Promise<AdminSession | null> {
  return openSession(cookies.get(sessionCookie)?.value ?? '');
}

export function writeSessionCookie(cookies: Cookies, sealed: string, url: URL): void {
  cookies.set(sessionCookie, sealed, cookieOptions(url, sessionSeconds));
}

export function writeStateCookie(cookies: Cookies, state: string, url: URL): void {
  cookies.set(stateCookie, state, cookieOptions(url, stateSeconds));
}

export function readState(cookies: Cookies): string {
  return cookies.get(stateCookie)?.value ?? '';
}

export function clearAdminCookies(cookies: Cookies, url: URL): void {
  const options = { path: '/', secure: url.protocol === 'https:', sameSite: 'lax' as const };
  cookies.delete(sessionCookie, options);
  cookies.delete(stateCookie, options);
}

export function newState(): string {
  return bytesToB64(crypto.getRandomValues(new Uint8Array(32)));
}

export function statesMatch(expected: string, got: string): boolean {
  if (!expected || !got) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(got);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isOwner(login: string): boolean {
  return login.toLowerCase() === owner.toLowerCase();
}

export function adminHtml(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title}</title></head><body style="font-family: system-ui, sans-serif; max-width: 36rem; margin: 4rem auto; padding: 0 1.25rem; line-height: 1.5; color: #1c1915; background: #f6f3ec"><h1>${title}</h1>${body}</body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
        'cache-control': 'no-store',
      },
    },
  );
}
