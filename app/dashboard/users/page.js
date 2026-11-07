'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatDate } from '@/lib/clientApi';

// Blank new-user form
const EMPTY = { full_name: '', email: '', role: 'nurse', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);          // New user form
  const [editing, setEditing] = useState(null);     // The user being edited, or null
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load all staff accounts
  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Create a new account
  async function createUser(event) {
    event.preventDefault();
    setError(''); setMessage('');
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setForm(EMPTY);
      setMessage('Account created.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Save changes to an existing account
  async function saveEdit(event) {
    event.preventDefault();
    setError(''); setMessage('');
    try {
      await apiFetch(`/api/users/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editing.full_name,
          role: editing.role,
          is_active: editing.is_active,
          password: editing.new_password || '',   // Empty means "do not change"
        }),
      });
      setEditing(null);
      setMessage('Account updated.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Staff accounts</h1>
          <p>Create accounts for doctors, nurses and administrators.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-ok">{message}</div>}

      {/* Create form */}
      <div className="card">
        <h2>Add a staff member</h2>
        <form onSubmit={createUser}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="new-name">Full name</label>
              <input id="new-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="new-email">Email</label>
              <input id="new-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="new-role">Role</label>
              <select id="new-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="nurse">Nurse</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-password">Temporary password</label>
              <input id="new-password" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <span className="hint">At least 8 characters with upper case, lower case and a number.</span>
            </div>
          </div>
          <button className="btn btn-primary">Create account</button>
        </form>
      </div>

      {/* Edit form (appears when "Edit" is pressed) */}
      {editing && (
        <div className="card">
          <h2>Edit {editing.email}</h2>
          <form onSubmit={saveEdit}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="edit-name">Full name</label>
                <input id="edit-name" required value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="edit-role">Role</label>
                <select id="edit-role" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-password">Reset password (optional)</label>
                <input id="edit-password" type="password" autoComplete="new-password" value={editing.new_password || ''} onChange={(e) => setEditing({ ...editing, new_password: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="edit-active">Account status</label>
                <select id="edit-active" value={editing.is_active ? 'yes' : 'no'} onChange={(e) => setEditing({ ...editing, is_active: e.target.value === 'yes' })}>
                  <option value="yes">Active</option>
                  <option value="no">Disabled</option>
                </select>
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-primary">Save changes</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Staff list */}
      <div className="card">
        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name"><strong>{u.full_name}</strong></td>
                  <td data-label="Email">{u.email}</td>
                  <td data-label="Role"><span className="badge badge-role">{u.role}</span></td>
                  <td data-label="Status">
                    <span className={`badge ${u.is_active ? 'badge-treated' : 'badge-off'}`}>{u.is_active ? 'Active' : 'Disabled'}</span>
                  </td>
                  <td data-label="Created">{formatDate(u.created_at)}</td>
                  <td><button className="btn btn-ghost btn-small" onClick={() => setEditing({ ...u, new_password: '' })}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
