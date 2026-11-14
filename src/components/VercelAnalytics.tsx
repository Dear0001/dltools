'use client';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

/** Query parameters that can hold text the visitor typed. They are removed before a page view is sent. */
const TYPED_PARAMS = ['q'];

/** Exported for tests: the URL Vercel Web Analytics receives for a page view. */
export function redactAnalyticsUrl(raw: string): string {
  try {
    const url = new URL(raw);
    TYPED_PARAMS.forEach((name) => url.searchParams.delete(name));
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Cookie-free page-view counts. Unlike Google Analytics this runs without a consent prompt,
 * so it must never receive what someone typed: search text (`?q=`) is stripped from every URL.
 */
export default function VercelAnalytics() {
  return <Analytics beforeSend={(event: BeforeSendEvent) => ({ ...event, url: redactAnalyticsUrl(event.url) })} />;
}
