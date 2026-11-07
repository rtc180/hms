'use client';

import { useState } from 'react';
import { useUser } from './UserContext';

// Common diagnoses offered as suggestions (the doctor can still type anything)
const COMMON_DIAGNOSES = [
  'Malaria', 'Typhoid', 'Hypertension', 'Type 2 diabetes', 'Pneumonia', 'Tuberculosis',
  'Gastroenteritis', 'Upper respiratory infection', 'Urinary tract infection', 'Asthma',
];

// Form for recording a visit.
//   Nurses see: complaint + vitals
//   Doctors and admins also see: diagnosis, treatment, status
export default function VisitForm({ initial, onSubmit, onCancel, submitLabel = 'Save visit' }) {
  const user = useUser();
  const canDiagnose = user.role === 'doctor' || user.role === 'admin';

  // Starting values; numbers from the database become text for the inputs
  const [form, setForm] = useState({
    complaint: initial?.complaint ?? '',
    temperature: initial?.temperature ?? '',
    blood_pressure: initial?.blood_pressure ?? '',
    pulse: initial?.pulse ?? '',
    weight: initial?.weight ?? '',
    diagnosis: initial?.diagnosis ?? '',
    treatment: initial?.treatment ?? '',
    status: initial?.status ?? 'waiting',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const change = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="field">
        <label htmlFor="complaint">Reason for visit *</label>
        <input id="complaint" required maxLength={500} value={form.complaint} onChange={change('complaint')} />
      </div>

      {/* Vital signs recorded by the nurse */}
      <div className="grid-4">
        <div className="field">
          <label htmlFor="temperature">Temperature (°C)</label>
          <input id="temperature" type="number" step="0.1" min="25" max="45" value={form.temperature} onChange={change('temperature')} />
        </div>
        <div className="field">
          <label htmlFor="blood_pressure">Blood pressure</label>
          <input id="blood_pressure" placeholder="120/80" maxLength={10} value={form.blood_pressure} onChange={change('blood_pressure')} />
        </div>
        <div className="field">
          <label htmlFor="pulse">Pulse (bpm)</label>
          <input id="pulse" type="number" min="20" max="260" value={form.pulse} onChange={change('pulse')} />
        </div>
        <div className="field">
          <label htmlFor="weight">Weight (kg)</label>
          <input id="weight" type="number" step="0.1" min="0.5" max="400" value={form.weight} onChange={change('weight')} />
        </div>
      </div>

      {/* Doctor-only section */}
      {canDiagnose && (
        <>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="diagnosis">Diagnosis</label>
              <input id="diagnosis" list="diagnosis-list" maxLength={255} value={form.diagnosis} onChange={change('diagnosis')} />
              <datalist id="diagnosis-list">
                {COMMON_DIAGNOSES.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="status">Visit status</label>
              <select id="status" value={form.status} onChange={change('status')}>
                <option value="waiting">Waiting for doctor</option>
                <option value="treated">Treated</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="treatment">Treatment and prescription</label>
            <textarea id="treatment" maxLength={4000} value={form.treatment} onChange={change('treatment')} />
          </div>
        </>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
