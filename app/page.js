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
  telephone: organization.phone,
  email: organization.email,
  address: { '@type': 'PostalAddress', streetAddress: organization.address },
  image: organization.logo,
};

export default function HomePage() {
  return (
    <main className="landing">
      {/* JSON-LD script for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header>
        <Image src={organization.logo} alt={`${organization.name} logo`} width={150} height={150} priority />
        <Link className="btn btn-primary" href="/login">Staff sign in</Link>
      </header>

      <section className="hero">
        <h1>Care that starts with listening</h1>
        <p>
          {organization.name} offers outpatient consultations, inpatient care, nursing services,
          laboratory support and follow-up for families in our community. {organization.tagline}.
        </p>
      </section>

      <section className="services" aria-label="Our services">
        <div className="card">
          <h2>Consultations</h2>
          <p>See a doctor for illness, check-ups and ongoing conditions such as hypertension and diabetes.</p>
        </div>
        <div className="card">
          <h2>Nursing care</h2>
          <p>Vital signs, dressings, injections and health education from our nursing team.</p>
        </div>
        <div className="card">
          <h2>Malaria and fever care</h2>
          <p>Fast testing and treatment for malaria and other common infections.</p>
        </div>
        <div className="card">
          <h2>Inpatient care</h2>
          <p>Hospital admissions and coordinated care throughout a patient's stay.</p>
        </div>
      </section>

      <footer>
        <p>
          <strong>{organization.name}</strong><br />
          {organization.address}<br />
          Phone: {organization.phone} &nbsp;|&nbsp; Email: {organization.email}
        </p>
      </footer>
    </main>
  );
}
