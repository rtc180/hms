// Tells search engines what they may index. Private areas are blocked.
import { getSiteUrl } from '@/lib/site-url.mjs';

const siteUrl = getSiteUrl();

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/api', '/login'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
