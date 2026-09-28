import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const path = context.url.pathname;
  if (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path.startsWith('/keystatic') ||
    path.startsWith('/api/keystatic')
  ) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
});
