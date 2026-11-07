'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatDateTime } from '@/lib/clientApi';
import { useUser } from '@/components/UserContext';

export default function AdmissionsPage() {
  const user = useUser();
  const [admissions, setAdmissions] = useState([]);
  const [beds, setBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [status, setStatus] = useState('admitted');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [form, setForm] = useState({ bed_id: '', reason: '' });
  const [newBed, setNewBed] = useState({ ward: '', bed_number: '' });
  const [dischargeId, setDischargeId] = useState(null);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBeds = useCallback(async () => {
    try {
      const data = await apiFetch('/api/beds');
      setBeds(data.beds);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAdmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ status, page: String(page) });
      const data = await apiFetch(`/api/admissions?${params.toString()}`);
      setAdmissions(data.admissions);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { loadAdmissions(); }, [loadAdmissions]);
  useEffect(() => { loadBeds(); }, [loadBeds]);

  useEffect(() => {
    if (patientSearch.trim().length < 2 || selectedPatient) {
      setPatients([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: patientSearch.trim(), page: '1' });
        const data = await apiFetch(`/api/patients?${params.toString()}`);
        setPatients(data.patients);
      } catch (err) {
        setError(err.message);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [patientSearch, selectedPatient]);

  async function admitPatient(event) {
    event.preventDefault();
    if (!selectedPatient) {
      setError('Search for and select a patient first');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/api/admissions', {
        method: 'POST',
        body: JSON.stringify({ ...form, patient_id: selectedPatient.id }),
      });
      setSelectedPatient(null);
      setPatientSearch('');
      setForm({ bed_id: '', reason: '' });
      setStatus('admitted');
      setPage(1);
      setMessage(`${selectedPatient.first_name} ${selectedPatient.last_name} admitted successfully.`);
      await loadAdmissions();
      await loadBeds();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addBed(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/api/beds', { method: 'POST', body: JSON.stringify(newBed) });
      setNewBed({ ward: '', bed_number: '' });
      setMessage('Bed added to the ward map.');
      await loadBeds();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setBedActive(bed, isActive) {
    setError('');
    try {
      await apiFetch(`/api/beds/${bed.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
      await loadBeds();
    } catch (err) {
      setError(err.message);
    }
  }

  async function dischargePatient(event, id) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/admissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ discharge_notes: dischargeNotes }),
      });
      setDischargeId(null);
      setDischargeNotes('');
      setMessage('Patient discharged successfully. The bed is now available.');
      await loadAdmissions();
      await loadBeds();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inpatient admissions</h1>
          <p>Admit patients, track ward and bed occupancy, and record discharges.</p>
        </div>
      </div>

      {message && <div className="alert alert-ok">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="page-head">
          <div>
            <h2>Ward bed map</h2>
            <p>{beds.filter((bed) => bed.is_active && bed.status === 'available').length} available · {beds.filter((bed) => bed.is_active && bed.status === 'occupied').length} occupied</p>
          </div>
        </div>
        {beds.length === 0 && <p className="empty">No beds configured yet. An administrator can add beds below.</p>}
        <div className="bed-map">
          {beds.map((bed) => (
            <div className={`bed-tile ${!bed.is_active ? 'bed-inactive' : bed.status === 'occupied' ? 'bed-occupied' : 'bed-available'}`} key={bed.id}>
              <strong>{bed.ward}</strong>
              <span>Bed {bed.bed_number}</span>
              <span className="bed-status">{!bed.is_active ? 'Inactive' : bed.status === 'occupied' ? `Occupied · ${bed.first_name} ${bed.last_name}` : 'Available'}</span>
              {user.role === 'admin' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={bed.status === 'occupied'}
                  onClick={() => setBedActive(bed, !bed.is_active)}
                >
                  {bed.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          ))}
        </div>
        {user.role === 'admin' && (
          <form className="bed-add-form" onSubmit={addBed}>
            <h3>Add ward bed</h3>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="new-ward">Ward</label>
                <input id="new-ward" required maxLength={80} value={newBed.ward} onChange={(event) => setNewBed({ ...newBed, ward: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="new-bed-number">Bed number</label>
                <input id="new-bed-number" required maxLength={20} value={newBed.bed_number} onChange={(event) => setNewBed({ ...newBed, bed_number: event.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-ghost" disabled={saving}>Add bed</button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Admit a patient</h2>
        <form onSubmit={admitPatient}>
          <div className="field">
            <label htmlFor="patient-search">Find patient by name or patient number</label>
            {selectedPatient ? (
              <div className="actions">
                <strong>{selectedPatient.first_name} {selectedPatient.last_name} ({selectedPatient.patient_no})</strong>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setSelectedPatient(null)}>Change</button>
              </div>
            ) : (
              <input
                id="patient-search"
                type="search"
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                autoComplete="off"
              />
            )}
            {patients.length > 0 && !selectedPatient && (
              <div className="patient-picker" role="list">
                {patients.map((patient) => (
                  <button
                    type="button"
                    className="patient-picker-option"
                    key={patient.id}
                    onClick={() => { setSelectedPatient(patient); setPatients([]); setError(''); }}
                  >
                    {patient.first_name} {patient.last_name} <span>{patient.patient_no}</span>
                  </button>
                ))}
              </div>
            )}
            {!selectedPatient && patientSearch.trim().length >= 2 && patients.length === 0 && (
              <span className="hint">No matching patients found.</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="available-bed">Available bed</label>
            <select id="available-bed" required value={form.bed_id} onChange={(event) => setForm({ ...form, bed_id: event.target.value })}>
              <option value="">Select an available bed</option>
              {beds.filter((bed) => bed.is_active && bed.status === 'available').map((bed) => (
                <option key={bed.id} value={bed.id}>{bed.ward} · Bed {bed.bed_number}</option>
              ))}
            </select>
            {beds.filter((bed) => bed.is_active && bed.status === 'available').length === 0 && (
              <span className="hint">No available beds. Choose an available bed from the ward map or ask an administrator to configure beds.</span>
            )}
          </div>
          <div className="field">
            <label htmlFor="reason">Reason for admission</label>
            <textarea id="reason" required maxLength={500} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || !selectedPatient || !form.bed_id}>
            {saving ? 'Saving...' : 'Admit patient'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="page-head">
          <div>
            <h2>{status === 'admitted' ? 'Current inpatients' : status === 'discharged' ? 'Discharged patients' : 'All admissions'}</h2>
            <p>{total} admission{total === 1 ? '' : 's'}</p>
          </div>
          <div className="field" style={{ minWidth: '180px', margin: 0 }}>
            <label htmlFor="admission-status">Show</label>
            <select id="admission-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="admitted">Current inpatients</option>
              <option value="discharged">Discharged</option>
              <option value="all">All admissions</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr><th>Patient</th><th>Ward / bed</th><th>Admitted</th><th>Reason</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {admissions.map((admission) => (
                <tr key={admission.id}>
                  <td data-label="Patient"><strong>{admission.first_name} {admission.last_name}</strong><br />{admission.patient_no}</td>
                  <td data-label="Ward / bed">{admission.ward} / {admission.bed_number}</td>
                  <td data-label="Admitted">{formatDateTime(admission.admitted_at)}</td>
                  <td data-label="Reason">{admission.reason}</td>
                  <td data-label="Status"><span className={`badge ${admission.status === 'admitted' ? 'badge-waiting' : 'badge-treated'}`}>{admission.status}</span></td>
                  <td data-label="Actions">
                    {admission.status === 'admitted' && user.role !== 'nurse' && (
                      dischargeId === admission.id ? (
                        <form onSubmit={(event) => dischargePatient(event, admission.id)}>
                          <div className="field">
                            <label htmlFor={`discharge-notes-${admission.id}`}>Discharge notes (optional)</label>
                            <textarea id={`discharge-notes-${admission.id}`} maxLength={2000} value={dischargeNotes} onChange={(event) => setDischargeNotes(event.target.value)} />
                          </div>
                          <div className="actions">
                            <button className="btn btn-primary btn-small" disabled={saving}>Confirm discharge</button>
                            <button type="button" className="btn btn-ghost btn-small" onClick={() => setDischargeId(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button className="btn btn-ghost btn-small" onClick={() => { setDischargeId(admission.id); setDischargeNotes(''); }}>Discharge</button>
                      )
                    )}
                    {admission.status === 'discharged' && admission.discharged_at && (
                      <span className="hint">Discharged {formatDateTime(admission.discharged_at)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && admissions.length === 0 && <p className="empty">No admissions match this view.</p>}
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
          <button className="btn btn-ghost btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {lastPage}</span>
          <button className="btn btn-ghost btn-small" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}
