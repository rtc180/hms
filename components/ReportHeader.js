'use client';

// The letterhead shown at the top of every report and printed document.
import { useEffect, useState } from 'react';
import { organization } from '@/config/organization';
import { apiFetch } from '@/lib/clientApi';

export default function ReportHeader({ title, subtitle }) {
  const [company, setCompany] = useState(organization);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    apiFetch('/api/organization')
      .then((data) => setCompany(data.organization))
      .catch((error) => setLoadError(error.message));
  }, []);

  return (
    <div>
      {loadError && <div className="alert alert-error">Could not load current company details: {loadError}</div>}
      {/* Organization logo and contact details */}
      <div className="report-head">
        {/* A plain <img> is used so the logo always prints reliably */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={organization.logo} alt={`${company.name} logo`} width="90" height="90" />
        <div>
          <h2>{company.name}</h2>
          {company.address && <p>{company.address}</p>}
          <p>{[
            company.phone && `Tel: ${company.phone}`,
            company.email && `Email: ${company.email}`,
          ].filter(Boolean).join(' | ')}</p>
          {[company.website, company.registration].filter(Boolean).length > 0 && (
            <p>{[company.website, company.registration].filter(Boolean).join(' | ')}</p>
          )}
        </div>
      </div>

      {/* Report title and the date it was created */}
      <div className="report-title">
        <h3>{title}</h3>
        <span>Generated: {new Date().toLocaleString('en-GB')}</span>
      </div>
      {subtitle && <p className="report-meta">{subtitle}</p>}
    </div>
  );
}
