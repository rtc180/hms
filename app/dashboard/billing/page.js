'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatDateTime } from '@/lib/clientApi';

const EMPTY_PAYMENT = { amount: '', payment_method: 'cash' };

export default function BillingPage() {
  const [visits, setVisits] = useState([]);
  const [bills, setBills] = useState([]);
  const [fees, setFees] = useState({});
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/billing');
      setVisits(data.visits);
      setBills(data.bills);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createBill(event, visitId) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await apiFetch('/api/billing', {
        method: 'POST',
        body: JSON.stringify({ visit_id: visitId, consultation_fee: fees[visitId] ?? '0.00' }),
      });
      setMessage(`Bill #${data.bill.id} created. Record payment below.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function recordPayment(event, bill) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payment = payments[bill.id] || EMPTY_PAYMENT;
      await apiFetch(`/api/billing/${bill.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(payment),
      });
      setPayments((current) => ({ ...current, [bill.id]: EMPTY_PAYMENT }));
      setMessage(`Payment recorded for bill #${bill.id}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Billing</h1><p>Create bills for treated visits and record payments.</p></div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-ok" role="status">{message}</div>}

      <section className="card">
        <h2>Visits ready for billing ({visits.length})</h2>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Patient</th><th>Treated</th><th>Diagnosis</th><th>Prescriptions</th><th>Consultation fee</th><th></th></tr></thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.visit_id}>
                  <td data-label="Patient"><strong>{visit.first_name} {visit.last_name}</strong><br />{visit.patient_no}</td>
                  <td data-label="Treated">{formatDateTime(visit.visit_date)}</td>
                  <td data-label="Diagnosis">{visit.diagnosis || '-'}</td>
                  <td data-label="Prescriptions">{visit.pending_prescriptions ? `${visit.pending_prescriptions} pending` : 'Ready'}</td>
                  <td data-label="Consultation fee">
                    <label className="inline-field">Consultation fee
                      <input type="number" min="0" step="0.01" value={fees[visit.visit_id] ?? '0.00'} onChange={(event) => setFees((current) => ({ ...current, [visit.visit_id]: event.target.value }))} />
                    </label>
                  </td>
                  <td data-label="Action">
                    <button className="btn btn-primary btn-small" disabled={saving || visit.pending_prescriptions > 0} onClick={(event) => createBill(event, visit.visit_id)}>
                      {visit.pending_prescriptions ? 'Awaiting dispensing' : 'Create bill'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && visits.length === 0 && <p className="empty">There are no treated visits waiting to be billed.</p>}
      </section>

      <section className="card">
        <h2>Bills and payments ({bills.length})</h2>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Bill</th><th>Patient</th><th>Created</th><th>Charges</th><th>Paid / balance</th><th>Status / payment</th></tr></thead>
            <tbody>
              {bills.map((bill) => {
                const balance = Math.max(0, Number(bill.total_amount) - Number(bill.amount_paid));
                const payment = payments[bill.id] || EMPTY_PAYMENT;
                return (
                  <tr key={bill.id}>
                    <td data-label="Bill">#{bill.id}<br />Visit #{bill.visit_id}</td>
                    <td data-label="Patient"><strong>{bill.first_name} {bill.last_name}</strong><br />{bill.patient_no}</td>
                    <td data-label="Created">{formatDateTime(bill.created_at)}</td>
                    <td data-label="Charges">Consultation {Number(bill.consultation_fee).toFixed(2)}<br />Medicines {Number(bill.medication_total).toFixed(2)}<br /><strong>Total {Number(bill.total_amount).toFixed(2)}</strong></td>
                    <td data-label="Paid / balance">Paid {Number(bill.amount_paid).toFixed(2)}<br />Balance {balance.toFixed(2)}</td>
                    <td data-label="Status / payment">
                      <span className={`badge ${bill.status === 'paid' ? 'badge-treated' : 'badge-waiting'}`}>{bill.status}</span>
                      {balance > 0 && (
                        <form className="payment-form" onSubmit={(event) => recordPayment(event, bill)}>
                          <label>Amount<input type="number" min="0.01" max={balance.toFixed(2)} step="0.01" required value={payment.amount} onChange={(event) => setPayments((current) => ({ ...current, [bill.id]: { ...payment, amount: event.target.value } }))} /></label>
                          <label>Method
                            <select value={payment.payment_method} onChange={(event) => setPayments((current) => ({ ...current, [bill.id]: { ...payment, payment_method: event.target.value } }))}>
                              <option value="cash">Cash</option><option value="card">Card</option><option value="mobile_money">Mobile money</option><option value="insurance">Insurance</option><option value="other">Other</option>
                            </select>
                          </label>
                          <button className="btn btn-ghost btn-small" disabled={saving}>Record payment</button>
                        </form>
                      )}
                      {bill.payments?.length > 0 && <details className="payment-history"><summary>Payment history ({bill.payments.length})</summary>{bill.payments.map((item) => <p key={item.id}>{Number(item.amount).toFixed(2)} · {item.payment_method} · {formatDateTime(item.created_at)}</p>)}</details>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && bills.length === 0 && <p className="empty">No bills have been created yet.</p>}
      </section>
    </>
  );
}
