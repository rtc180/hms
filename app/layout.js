// Root layout: wraps every page. Sets the font, language and default SEO metadata.
import { Figtree } from 'next/font/google';
import './globals.css';
import { organization } from '@/config/organization';

// Self-hosted Google font (fast, no tracking, works with our strict CSP)
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-body',   // Exposed as a CSS variable used in globals.css
  display: 'swap',           // Show text immediately, swap font when loaded
});

// Public site address, used to build absolute URLs for search engines
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// SEO metadata shared by all pages
export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${organization.name} | Trusted healthcare in Harare`,  // Used when a page has no title
    template: `%s | ${organization.name}`,                           // "Patients | Good Samaritan..."
  },
  description: `${organization.name} provides outpatient and inpatient care, nursing and diagnosis. ${organization.tagline}.`,
  applicationName: organization.name,
  openGraph: {                       // Preview card when the link is shared on WhatsApp, Facebook, etc.
    type: 'website',
    siteName: organization.name,
    title: organization.name,
    description: organization.tagline,
    images: [{ url: organization.logo, width: 700, height: 700, alt: `${organization.name} logo` }],
  },
  twitter: { card: 'summary', title: organization.name, description: organization.tagline },
  alternates: { canonical: '/' },
};

// Makes phones render the page at the right size (responsive design)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b2472',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('hms-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else{document.documentElement.removeAttribute('data-theme')}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
