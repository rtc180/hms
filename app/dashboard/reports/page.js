'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, formatDate } from '@/lib/clientApi';
import { useUser } from '@/components/UserContext';
import ReportHeader from '@/components/ReportHeader';

// Human-readable names for the time periods
const PERIOD_LABELS = {
  '7d': 'last 7 days', '1m': 'last month', '3m': 'last 3 months', '6m': 'last 6 months', '1y': 'last year',
};

// Blank filter values
const EMPTY_FILTERS = {
  q: '', diagnosis: '', status: '', gender: '', ageMin: '', ageMax: '', period: '', from: '', to: '',
};

export default function ReportsPage() {
  const user = useUser();
  const [filters, setFilters] = useState(EMPTY_FILTERS);  // Current values of the filter form
  const [report, setReport] = useState(null);             // Result from the server
  const [usedFilters, setUsedFilters] = useState(EMPTY_FILTERS); // Filters that produced the result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Returns an onChange handler for a given filter
  const change = (name) => (event) => setFilters({ ...filters, [name]: event.target.value });

  // Ask the server for a report using the given filters
  async function runReport(values) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      // Only send filters that have a value
      for (const [key, value] of Object.entries(values)) {
        if (value) params.set(key, value);
      }
      const data = await apiFetch(`/api/reports?${params.toString()}`);
      setReport(data);
      setUsedFilters(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Form submit
  function handleSubmit(event) {
    event.preventDefault();
    runReport(filters);
  }

  // One-click presets: set the filters and run the report immediately
  function applyPreset(values) {
    const next = { ...EMPTY_FILTERS, ...values };
    setFilters(next);
    runReport(next);
  }

  // Clear everything
  function resetAll() {
    setFilters(EMPTY_FILTERS);
    setReport(null);
    setError('');
  }

  // Build a plain-English description of the filters, printed under the report title
  function describeFilters(f) {
    const parts = [];
    if (f.q) parts.push(`patient matches "${f.q}"`);
    if (f.diagnosis) parts.push(`diagnosis contains "${f.diagnosis}"`);
    if (f.status) parts.push(`status is ${f.status}`);
    if (f.gender) parts.push(`gender is ${f.gender}`);
    if (f.ageMin || f.ageMax) parts.push(`age ${f.ageMin || '0'} to ${f.ageMax || 'any'}`);
    if (f.period) parts.push(`period: ${PERIOD_LABELS[f.period]}`);
    else if (f.from || f.to) parts.push(`dates: ${f.from || 'start'} to ${f.to || 'today'}`);
    return parts.length ? `Filters: ${parts.join('; ')}` : 'Filters: none (all visits)';
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Reports</h1>
          <p>Filter visits, then print the result on organization letterhead.</p>
        </div>
      </div>

      {/* ---- Filter form (hidden when printing) ---- */}
      <div className="card no-print">
        <h2>Quick reports</h2>
        <div className="actions" style={{ marginBottom: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => applyPreset({})}>All Patients</button>
          <button className="btn btn-ghost" onClick={() => applyPreset({ status: 'treated', period: '1m' })}>Treated last month</button>
          <button className="btn btn-ghost" onClick={() => applyPreset({ status: 'treated', period: '3m' })}>Treated in the last 3 months</button>
        </div>

        <h2>Custom filters</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="q">Patient name, number or ID</label>
              <input id="q" value={filters.q} onChange={change('q')} />
            </div>
            <div className="field">
              <label htmlFor="diagnosis">Illness or diagnosis</label>
              <input id="diagnosis" placeholder="e.g. Malaria" value={filters.diagnosis} onChange={change('diagnosis')} />
            </div>
            <div className="field">
              <label htmlFor="status">Visit status</label>
              <select id="status" value={filters.status} onChange={change('status')}>
                <option value="">Any</option>
                <option value="treated">Treated</option>
                <option value="waiting">Waiting</option>
              </select>
            </div>
          </div>

          <div className="grid-4">
            <div className="field">
              <label htmlFor="period">Quick period</label>
              <select id="period" value={filters.period} onChange={change('period')}>
                <option value="">Custom dates / all time</option>
                <option value="7d">Last 7 days</option>
                <option value="1m">Last month</option>
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="from">From date</label>
              <input id="from" type="date" disabled={!!filters.period} value={filters.from} onChange={change('from')} />
            </div>
            <div className="field">
              <label htmlFor="to">To date</label>
              <input id="to" type="date" disabled={!!filters.period} value={filters.to} onChange={change('to')} />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" value={filters.gender} onChange={change('gender')}>
                <option value="">Any</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid-4">
            <div className="field">
              <label htmlFor="ageMin">Minimum age</label>
              <input id="ageMin" type="number" min="0" max="130" value={filters.ageMin} onChange={change('ageMin')} />
            </div>
            <div className="field">
              <label htmlFor="ageMax">Maximum age</label>
              <input id="ageMax" type="number" min="0" max="130" value={filters.ageMax} onChange={change('ageMax')} />
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Run report'}</button>
            <button type="button" className="btn btn-ghost" onClick={resetAll}>Clear filters</button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error no-print">{error}</div>}

      {/* ---- Report result: this card is what gets printed ---- */}
      {report && (
        <div className="card">
          <div className="page-head no-print">
            <h2>Results</h2>
            <button className="btn btn-primary" onClick={() => window.print()}>Print report</button>
          </div>

          <ReportHeader title="Patient visit report" subtitle={describeFilters(usedFilters)} />

          {/* Summary numbers */}
          <p>
            <strong>{report.summary.totalVisits}</strong> visit{report.summary.totalVisits === 1 ? '' : 's'} for{' '}
            <strong>{report.summary.totalPatients}</strong> patient{report.summary.totalPatients === 1 ? '' : 's'}.
          </p>
          {report.summary.truncated && (
            <div className="alert alert-error">Only the 1000 newest visits are listed. Narrow your filters to see the rest.</div>
          )}

          {/* Diagnosis breakdown */}
          {report.summary.byDiagnosis.length > 0 && (
            <>
              <h3>Breakdown by diagnosis</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Diagnosis</th><th>Visits</th></tr></thead>
                  <tbody>
                    {report.summary.byDiagnosis.map((row) => (
                      <tr key={row.diagnosis}><td>{row.diagnosis}</td><td>{row.total}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Detailed rows */}
          <h3 style={{ marginTop: '1.25rem' }}>Visit details</h3>
          {report.rows.length === 0 ? (
            <p className="empty">No visits match these filters. Try widening the dates or removing a filter.</p>
          ) : (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th>Date</th><th>Patient no.</th><th>Patient</th><th>Sex</th><th>Age</th>
                    <th>Complaint</th><th>Diagnosis</th><th>Status</th><th>Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.id}>
                      <td data-label="Date">{formatDate(row.visit_date)}</td>
                      <td data-label="Patient no.">{row.patient_no}</td>
                      <td data-label="Patient">
                        <Link href={`/dashboard/patients/${row.patient_id}`}>{row.first_name} {row.last_name}</Link>
                      </td>
                      <td data-label="Sex">{row.gender}</td>
                      <td data-label="Age">{row.age}</td>
                      <td data-label="Complaint">{row.complaint}</td>
                      <td data-label="Diagnosis">{row.diagnosis || '-'}</td>
                      <td data-label="Status">{row.status === 'treated' ? 'Treated' : 'Waiting'}</td>
                      <td data-label="Doctor">{row.doctor_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer visible on paper only */}
          <div className="report-foot">
            Printed by {user.name} ({user.role}). This report contains confidential patient information.
          </div>
        </div>
      )}
    </>
  );
}
