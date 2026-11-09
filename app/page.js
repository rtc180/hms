// Public home page. It is the only page search engines index, so it carries the SEO content.
import Image from 'next/image';
import Link from 'next/link';
import { organization } from '@/config/organization';

// Structured data (JSON-LD) helps Google show the clinic's details in search results
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  name: organization.name,
  description: organization.tagline,
  telephone: organization.phone || undefined,
  email: organization.email || undefined,
  address: organization.address ? { '@type': 'PostalAddress', streetAddress: organization.address } : undefined,
  image: organization.logo,
};

export default function HomePage() {
  return (
    <main className="landing landing-page">
      {/* JSON-LD script for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label={`${organization.name} home`}>
          <Image src={organization.logo} alt="" width={76} height={76} priority />
          <span>
            <strong>{organization.name}</strong>
            <small>{organization.tagline}</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#care">Our care</a>
          <a href="#about">About us</a>
          <a href="#contact">Contact</a>
        </nav>
        <Link className="btn btn-primary landing-signin" href="/login">
          Staff sign in <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow"><span aria-hidden="true" /> Here for your health</span>
          <h1>Thoughtful care.<br /><span>Stronger</span> together.</h1>
          <p>
            From your first consultation to ongoing support, our team is here to help you and your
            family take the next step toward better health.
          </p>
          <div className="landing-hero-actions">
            <a className="btn btn-primary" href={`tel:${organization.phone.replace(/[^\d+]/g, '')}`}>
              Call {organization.phone} <span aria-hidden="true">↗</span>
            </a>
            <a className="landing-text-link" href="#care">Explore our services <span aria-hidden="true">↓</span></a>
          </div>
          <div className="landing-hero-note">
            <span className="landing-note-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <span><strong>Care centered on you</strong><small>Compassionate support at every step</small></span>
          </div>
        </div>

        <div className="landing-hero-art" aria-label="Good Samaritan Medical Center">
          <div className="landing-art-orbit landing-art-orbit-one" />
          <div className="landing-art-orbit landing-art-orbit-two" />
          <div className="landing-art-glow" />
          <div className="landing-art-card">
            <Image src={organization.logo} alt={`${organization.name} logo`} width={220} height={220} priority />
            <span className="landing-art-caption">Good care begins with a conversation.</span>
          </div>
          <span className="landing-art-dot landing-art-dot-one" />
          <span className="landing-art-dot landing-art-dot-two" />
          <div className="landing-art-label"><span /> Patient-first care</div>
        </div>
      </section>

      <section className="landing-contact-strip" aria-label="Contact information">
        {organization.address && (
          <div className="landing-strip-item">
            <span className="landing-strip-icon" aria-hidden="true">⌖</span>
            <span><small>Find us</small><strong>{organization.address}</strong></span>
          </div>
        )}
        <div className="landing-strip-item">
          <span className="landing-strip-icon" aria-hidden="true">◷</span>
          <span><small>Talk to our team</small><strong><a href={`tel:${organization.phone.replace(/[^\d+]/g, '')}`}>{organization.phone}</a></strong></span>
        </div>
        <div className="landing-strip-item">
          <span className="landing-strip-icon" aria-hidden="true">◉</span>
          <span><small>Message us on WhatsApp</small><strong><a href={`https://wa.me/${organization.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">Chat with our team</a></strong></span>
        </div>
      </section>

      <section className="landing-care-section" id="care">
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-kicker">How we can help</span>
            <h2>Care for every part<br />of your journey.</h2>
          </div>
          <p>Clear guidance, attentive professionals, and a team that treats every patient with respect.</p>
        </div>

        <div className="landing-services">
          <article className="landing-service-card">
            <span className="landing-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 20V8l8-5 8 5v12" /><path d="M9 20v-6h6v6M12 8v4m-2-2h4" /></svg>
            </span>
            <span className="landing-service-number">01</span>
            <h3>Doctor consultations</h3>
            <p>Personal consultations for illness, health concerns and ongoing conditions.</p>
          </article>
          <article className="landing-service-card">
            <span className="landing-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 21s-8-4.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.6-8 11-8 11Z" /><path d="M12 8v7m-3.5-3.5h7" /></svg>
            </span>
            <span className="landing-service-number">02</span>
            <h3>Nursing care</h3>
            <p>Professional nursing support, vital signs and guidance for your care plan.</p>
          </article>
          <article className="landing-service-card">
            <span className="landing-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></svg>
            </span>
            <span className="landing-service-number">03</span>
            <h3>Fever and malaria care</h3>
            <p>Assessment and care for fever, malaria and common infections.</p>
          </article>
          <article className="landing-service-card">
            <span className="landing-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16" /><path d="M9 21v-6h6v6M12 7v5m-2.5-2.5h5" /></svg>
            </span>
            <span className="landing-service-number">04</span>
            <h3>Inpatient care</h3>
            <p>Hospital admissions and coordinated support throughout your stay.</p>
          </article>
        </div>
      </section>

      <section className="landing-about" id="about">
        <div className="landing-about-mark" aria-hidden="true">
          <Image src={organization.logo} alt="" width={120} height={120} />
        </div>
        <div className="landing-about-copy">
          <span className="landing-section-kicker">Good Samaritan Medical Center</span>
          <h2>Healthcare with<br />humanity at its heart.</h2>
          <p>
            We believe good healthcare starts with listening. Our team is committed to making each
            visit welcoming, clear and focused on what matters to you.
          </p>
          <a href="#contact" className="landing-text-link">Get in touch <span aria-hidden="true">→</span></a>
        </div>
        <div className="landing-about-quote">
          <span aria-hidden="true">“</span>
          <p>Compassionate care for every patient.</p>
          <small>{organization.name}</small>
        </div>
      </section>

      <section className="landing-cta" id="contact">
        <div>
          <span className="landing-section-kicker">We’re here to help</span>
          <h2>Let’s take care<br />of your health.</h2>
          <p>Reach out to our team to learn more about our services.</p>
        </div>
        <div className="landing-cta-actions">
          <a className="btn btn-light" href={`tel:${organization.phone.replace(/[^\d+]/g, '')}`}>Call {organization.phone} <span aria-hidden="true">↗</span></a>
          <a href={`https://wa.me/${organization.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
          {organization.address && <span>{organization.address}</span>}
        </div>
        <span className="landing-cta-watermark" aria-hidden="true">+</span>
      </section>

      <footer className="landing-footer">
        <Link className="landing-footer-brand" href="/">
          <Image src={organization.logo} alt="" width={44} height={44} />
          <strong>{organization.name}</strong>
        </Link>
        <span>{organization.tagline}</span>
        <div><Link href="/login">Staff sign in</Link><span>© {new Date().getFullYear()} {organization.name}</span></div>
      </footer>
    </main>
  );
}
