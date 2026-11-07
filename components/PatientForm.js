'use client';

import { useState } from 'react';

// Blank form values
const EMPTY = {
  first_name: '', last_name: '', gender: '', date_of_birth: '', national_id: '', phone: '',
  address: '', blood_group: '', allergies: '', next_of_kin_name: '', next_of_kin_phone: '',
};

// Used both for registering a new patient and for editing one.
// "initial" holds existing values when editing. "onSubmit" receives the form values.
export default function PatientForm({ initial, onSubmit, onCancel, submitLabel = 'Save patient' }) {
  // Copy the starting values into state. Null values from the database become empty text.
  const [form, setForm] = useState(() => {
    const start = { ...EMPTY };
    if (initial) {
      for (const key of Object.keys(EMPTY)) {
        const value = initial[key];
        // Dates from the database look like 2001-09-09T00:00:00.000Z; keep only the first 10 characters
        start[key] = value ? String(value).slice(0, key === 'date_of_birth' ? 10 : undefined) : '';
      }
    }
    return start;
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Returns an onChange handler for a given field name
  const change = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);               // The parent page decides what to do with the values
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Today's date in YYYY-MM-DD, so the date picker cannot choose a future birth date
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="grid-3">
        <div className="field">
          <label htmlFor="first_name">First name *</label>
          <input id="first_name" required maxLength={80} value={form.first_name} onChange={change('first_name')} />
        </div>
        <div className="field">
          <label htmlFor="last_name">Last name *</label>
          <input id="last_name" required maxLength={80} value={form.last_name} onChange={change('last_name')} />
        </div>
        <div className="field">
          <label htmlFor="gender">Gender *</label>
          <select id="gender" required value={form.gender} onChange={change('gender')}>
            <option value="">Choose...</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label htmlFor="date_of_birth">Date of birth *</label>
          <input id="date_of_birth" type="date" required max={today} value={form.date_of_birth} onChange={change('date_of_birth')} />
        </div>
        <div className="field">
          <label htmlFor="national_id">National ID</label>
          <input id="national_id" maxLength={40} value={form.national_id} onChange={change('national_id')} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" maxLength={30} value={form.phone} onChange={change('phone')} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">Home address</label>
        <input id="address" maxLength={255} value={form.address} onChange={change('address')} />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="blood_group">Blood group</label>
          <select id="blood_group" value={form.blood_group} onChange={change('blood_group')}>
            <option value="">Unknown</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="allergies">Allergies</label>
          <input id="allergies" maxLength={255} value={form.allergies} onChange={change('allergies')} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="next_of_kin_name">Next of kin</label>
          <input id="next_of_kin_name" maxLength={120} value={form.next_of_kin_name} onChange={change('next_of_kin_name')} />
        </div>
        <div className="field">
          <label htmlFor="next_of_kin_phone">Next of kin phone</label>
          <input id="next_of_kin_phone" type="tel" maxLength={30} value={form.next_of_kin_phone} onChange={change('next_of_kin_phone')} />
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
