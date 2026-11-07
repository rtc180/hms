'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { useUser } from '@/components/UserContext';

const EMPTY = {
  name: '', shortName: '', tagline: '', address: '',
  phone: '', email: '', website: '', registration: '',
};

const THEME_OPTIONS = [
  { value: 'light', label: 'Light Mode' },
  { value: 'dark', label: 'Dark Mode' },
  { value: 'system', label: 'System Default' },
];

export default function OrganizationSettingsPage() {
  const user = useUser();
  const [form, setForm] = useState(EMPTY);
  const [theme, setTheme] = useState('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem('hms-theme');
      if (['light', 'dark', 'system'].includes(savedTheme)) setTheme(savedTheme);
    } catch {
      setError('Could not read the saved theme preference.');
    }

    apiFetch('/api/organization')
      .then((data) => setForm(data.organization))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function changeTheme(value) {
    try {
      window.localStorage.setItem('hms-theme', value);
      if (value === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', value);
      }
      setTheme(value);
      setError('');
    } catch {
      setError('Could not save the theme preference in this browser.');
    }
  }

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await apiFetch('/api/organization', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setForm(data.organization);
      setMessage('Company details saved. New reports will use the updated letterhead.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your appearance and the company information used on report letterheads.</p>
        </div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-ok" role="status">{message}</div>}
      <section className="card settings-card" aria-labelledby="theme-heading">
        <h2 id="theme-heading">Appearance</h2>
        <p className="settings-description">Choose how the system looks on this device.</p>
        <div className="theme-options" role="group" aria-label="Color theme">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn ${theme === option.value ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={theme === option.value}
              onClick={() => changeTheme(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
      {user.role === 'admin' && (
        <div className="card settings-card">
          <h2>Company details</h2>
          <p className="settings-description">These details appear on printed reports and patient summaries.</p>
          {loading ? <p className="empty">Loading company details...</p> : (
            <form onSubmit={save}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="company-name">Company name</label>
                <input id="company-name" required maxLength={160} value={form.name} onChange={change('name')} />
              </div>
              <div className="field">
                <label htmlFor="company-short-name">Short name</label>
                <input id="company-short-name" required maxLength={40} value={form.shortName} onChange={change('shortName')} />
              </div>
              <div className="field">
                <label htmlFor="company-tagline">Tagline</label>
                <input id="company-tagline" maxLength={200} value={form.tagline} onChange={change('tagline')} />
              </div>
              <div className="field">
                <label htmlFor="company-address">Address</label>
                <input id="company-address" required maxLength={255} value={form.address} onChange={change('address')} />
              </div>
              <div className="field">
                <label htmlFor="company-phone">Phone</label>
                <input id="company-phone" required maxLength={40} value={form.phone} onChange={change('phone')} />
              </div>
              <div className="field">
                <label htmlFor="company-email">Email</label>
                <input id="company-email" type="email" required maxLength={255} value={form.email} onChange={change('email')} />
              </div>
              <div className="field">
                <label htmlFor="company-website">Website</label>
                <input id="company-website" maxLength={255} value={form.website} onChange={change('website')} />
              </div>
              <div className="field">
                <label htmlFor="company-registration">Registration number</label>
                <input id="company-registration" maxLength={100} value={form.registration} onChange={change('registration')} />
              </div>
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save company details'}</button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
