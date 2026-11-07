'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/clientApi';
import { useUser } from '@/components/UserContext';

export default function DashboardHome() {
  const user = useUser();
  const [stats, setStats] = useState(null);   // Numbers from the server
  const [error, setError] = useState('');

  // Load the statistics once, when the page opens
  useEffect(() => {
    apiFetch('/api/stats').then(setStats).catch((err) => setError(err.message));
  }, []);

  // The biggest bar is used to scale the other bars
  const maxTotal = stats && stats.topDiagnoses.length ? stats.topDiagnoses[0].total : 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p>Here is what is happening at the hospital.</p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/dashboard/patients">Find or add a patient</Link>
          <Link className="btn btn-ghost" href="/dashboard/admissions">Manage admissions</Link>
          <Link className="btn btn-ghost" href="/dashboard/reports">Create a report</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!stats && !error && <p className="empty">Loading...</p>}

      {stats && (
        <>
          <div className="stats">
            <div className="stat"><strong>{stats.totalPatients}</strong><span>Registered patients</span></div>
            <div className="stat"><strong>{stats.visitsToday}</strong><span>Visits today</span></div>
            <div className="stat"><strong>{stats.waiting}</strong><span>Waiting for a doctor</span></div>
            <div className="stat"><strong>{stats.inpatients}</strong><span>Current inpatients</span></div>
            <div className="stat"><strong>{stats.treatedLast3Months}</strong><span>Treated in the last 3 months</span></div>
          </div>

          <div className="card">
            <h2>Most common diagnoses, last 3 months</h2>
            {stats.topDiagnoses.length === 0 && <p className="empty">No diagnoses recorded yet.</p>}
            {stats.topDiagnoses.map((item) => (
              <div className="bar-row" key={item.diagnosis}>
                <span>{item.diagnosis}</span>
                <div className="bar-track">
                  {/* Width is this diagnosis count divided by the biggest count */}
                  <div className="bar-fill" style={{ width: `${(item.total / maxTotal) * 100}%` }} />
                </div>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
