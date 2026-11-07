'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, formatDate } from '@/lib/clientApi';
import PatientForm from '@/components/PatientForm';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);   // Rows shown in the table
  const [total, setTotal] = useState(0);          // Total matches (for paging)
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');       // Text typed in the search box
  const [gender, setGender] = useState('');       // Gender filter
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false); // Is the "new patient" panel open?
  const [message, setMessage] = useState('');

  // Fetch one page of patients using the current filters
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('q', search);
      if (gender) params.set('gender', gender);
      const data = await apiFetch(`/api/patients?${params.toString()}`);
      setPatients(data.patients);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, gender]);

  // Reload when filters change. The 300ms delay waits until the user stops typing.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Save a new patient
  async function createPatient(values) {
    const result = await apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(values) });
    setShowForm(false);
    setMessage(`Patient registered with number ${result.patient.patient_no}.`);
    setPage(1);
    load();
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Patients</h1>
          <p>{total} patient{total === 1 ? '' : 's'} found</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close' : 'Register new patient'}
        </button>
      </div>

      {message && <div className="alert alert-ok">{message}</div>}

      {showForm && (
        <div className="card">
          <h2>New patient</h2>
          <PatientForm onSubmit={createPatient} onCancel={() => setShowForm(false)} submitLabel="Register patient" />
        </div>
      )}

      {/* Search and filter bar */}
      <div className="card">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="search">Search by name, patient number, phone or ID</label>
            <input
              id="search" type="search" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="field">
            <label htmlFor="gender-filter">Gender</label>
            <select id="gender-filter" value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr>
                <th>Patient no.</th><th>Name</th><th>Gender</th><th>Age</th><th>Phone</th><th>Date of birth</th><th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td data-label="Patient no.">{p.patient_no}</td>
                  <td data-label="Name"><strong>{p.first_name} {p.last_name}</strong></td>
                  <td data-label="Gender">{p.gender}</td>
                  <td data-label="Age">{p.age}</td>
                  <td data-label="Phone">{p.phone || '-'}</td>
                  <td data-label="Date of birth">{formatDate(p.date_of_birth)}</td>
                  <td><Link className="btn btn-ghost btn-small" href={`/dashboard/patients/${p.id}`}>Open file</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && patients.length === 0 && !error && (
          <p className="empty">No patients match your search. Try fewer words or register a new patient.</p>
        )}

        {/* Paging buttons */}
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
          <button className="btn btn-ghost btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {lastPage}</span>
          <button className="btn btn-ghost btn-small" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}
