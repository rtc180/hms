'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatDateTime } from '@/lib/clientApi';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [queryText, setQueryText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (queryText) params.set('q', queryText);
      const data = await apiFetch(`/api/audit-logs?${params.toString()}`);
      setLogs(data.logs);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, queryText]);

  useEffect(() => { load(); }, [load]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setQueryText(search.trim());
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>Review staff activity and changes recorded by the system.</p>
        </div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="card">
        <form className="audit-search" onSubmit={submitSearch}>
          <div className="field">
            <label htmlFor="audit-search">Search staff, action, record type or IP address</label>
            <input id="audit-search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="btn btn-primary">Search</button>
        </form>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr><th>Date and time</th><th>Staff member</th><th>Action</th><th>Record</th><th>Details</th><th>IP address</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Date and time">{formatDateTime(log.created_at)}</td>
                  <td data-label="Staff member">{log.user_name || 'Deleted account'}<br /><span className="hint">{log.user_email || ''}</span></td>
                  <td data-label="Action"><span className="badge badge-role">{log.action}</span></td>
                  <td data-label="Record">{log.entity || '-'}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                  <td data-label="Details"><code className="audit-details">{log.details ? JSON.stringify(log.details) : '-'}</code></td>
                  <td data-label="IP address">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && logs.length === 0 && <p className="empty">No audit records found.</p>}
        <div className="actions pagination">
          <button className="btn btn-ghost btn-small" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
          <span>{total} record{total === 1 ? '' : 's'} · Page {page} of {lastPage}</span>
          <button className="btn btn-ghost btn-small" disabled={page >= lastPage || loading} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}
