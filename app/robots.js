// Tells search engines what they may index. Private areas are blocked.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/api', '/login'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
