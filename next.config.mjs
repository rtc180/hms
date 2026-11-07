// Are we running in development mode?
const isDev = process.env.NODE_ENV !== 'production';

// Content Security Policy: tells the browser which sources of code it may trust.
const contentSecurityPolicy = [
  "default-src 'self'",                                                  // Only load things from our own site by default
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,   // Next.js needs inline scripts; eval only in dev
  "style-src 'self' 'unsafe-inline'",                                    // Allow our own styles
  "img-src 'self' data: blob:",                                          // Images from our site, data URIs and blobs
  "font-src 'self' data:",                                               // Fonts (next/font self-hosts them)
  "connect-src 'self'",                                                  // fetch() calls may only go to our own API
  "frame-ancestors 'none'",                                              // Nobody may embed this site in an iframe (anti-clickjacking)
  "base-uri 'self'",                                                     // Stops <base> tag injection
  "form-action 'self'",                                                  // Forms may only submit to our own site
  "object-src 'none'",                                                   // No plugins (Flash, etc.)
  ...(isDev ? [] : ['upgrade-insecure-requests']),                       // Force HTTPS in production
].join('; ');

// Headers applied to every response
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },                              // Older browsers: block iframes
  { key: 'X-Content-Type-Options', value: 'nosniff' },                    // Stop MIME-type guessing
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },   // Do not leak full URLs to other sites
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }, // Disable unused browser features
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }, // Always use HTTPS
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,   // Hide the "X-Powered-By: Next.js" header
  reactStrictMode: true,    // Helps find bugs during development
  async headers() {
    return [
      // Security headers for every page
      { source: '/:path*', headers: securityHeaders },
      // Patient data must never be cached by browsers or proxies
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
      {
        source: '/dashboard/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
