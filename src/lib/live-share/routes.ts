/**
 * Which app routes a Live Share host may make its viewers navigate to.
 *
 * Viewers follow the host through the app's *real* routes (`/tools/json-formatter`, …) — there is no separate
 * viewer page. This module has no imports so the WebSocket server (which ships only `src/lib/live-share`) can run
 * the same check. It is purely syntactic; the viewer additionally resolves a `/tools/<slug>` route against the
 * tool catalogue before navigating (see `LiveShareProvider`).
 *
 * Allowed: `/`, `/tools`, `/tools/<slug>`, `/categories/<slug>`. Nothing personal (`/favorites`), nothing that
 * acts (`/api/*`), no Live Share pages, no query string or fragment (they could carry data).
 */
const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const ROUTE_RE = new RegExp(`^/(?:tools(?:/${SLUG})?|categories/${SLUG})?$`);
export const MAX_ROUTE_LENGTH = 96;

/** Returns the canonical route (no trailing slash) or `null` when it must not be shared. */
export function normalizeShareRoute(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_ROUTE_LENGTH) return null;
  const route = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return ROUTE_RE.test(route) ? route : null;
}

/** The tool slug of a `/tools/<slug>` route, else `null`. */
export function toolSlugOfRoute(route: string): string | null {
  const m = /^\/tools\/([a-z0-9-]+)$/.exec(route);
  return m ? m[1] : null;
}
