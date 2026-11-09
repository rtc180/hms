// Lists the public pages for search engines. Patient data is never listed.
import { getSiteUrl } from '@/lib/site-url.mjs';

const siteUrl = getSiteUrl();

export default function sitemap() {
  return [{ url: siteUrl, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 }];
}
