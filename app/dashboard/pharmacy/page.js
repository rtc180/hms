'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatDateTime } from '@/lib/clientApi';
import { useUser } from '@/components/UserContext';

const EMPTY_MEDICINE = { name: '', strength: '', dosage_form: '', stock_quantity: '0', unit_price: '0.00' };

export default function PharmacyPage() {
  const user = useUser();
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [newMedicine, setNewMedicine] = useState(EMPTY_MEDICINE);
  const [inventoryEdits, setInventoryEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/pharmacy');
      setMedicines(data.medicines);
      setPrescriptions(data.prescriptions);
      setInventoryEdits(Object.fromEntries(data.medicines.map((item) => [
        item.id,
        { stock_to_add: '0', unit_price: item.unit_price },
      ])));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addMedicine(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/api/medicines', { method: 'POST', body: JSON.stringify(newMedicine) });
      setNewMedicine(EMPTY_MEDICINE);
      setMessage('Medicine added to pharmacy inventory.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateInventory(event, medicine) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const edit = inventoryEdits[medicine.id];
      await apiFetch(`/api/medicines/${medicine.id}`, {
        method: 'PATCH',
        body: JSON.stringify(edit),
      });
      setMessage(`${medicine.name} inventory updated.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function dispense(item) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/prescriptions/${item.id}`, { method: 'PATCH', body: JSON.stringify({}) });
      setMessage(`${item.medicine_name} dispensed for ${item.first_name} ${item.last_name}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function editInventory(medicine, field, value) {
    setInventoryEdits((current) => ({
      ...current,
      [medicine.id]: { ...current[medicine.id], [field]: value },
    }));
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Pharmacy</h1><p>Manage medicine stock and dispense prescriptions.</p></div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {message && <div className="alert alert-ok" role="status">{message}</div>}

      <section className="card">
        <h2>Pending prescriptions ({prescriptions.length})</h2>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Patient</th><th>Medicine</th><th>Instructions</th><th>Quantity</th><th>Prescribed</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {prescriptions.map((item) => (
                <tr key={item.id}>
                  <td data-label="Patient"><strong>{item.first_name} {item.last_name}</strong><br />{item.patient_no}</td>
                  <td data-label="Medicine">{item.medicine_name} {item.strength} {item.dosage_form}</td>
                  <td data-label="Instructions">{item.dosage_instructions}</td>
                  <td data-label="Quantity">{item.quantity}</td>
                  <td data-label="Prescribed">{formatDateTime(item.prescribed_at)}</td>
                  <td data-label="Stock">{item.stock_quantity}</td>
                  <td data-label="Action">
                    <button className="btn btn-primary btn-small" disabled={saving || item.stock_quantity < item.quantity} onClick={() => dispense(item)}>
                      {item.stock_quantity < item.quantity ? 'Insufficient stock' : 'Dispense'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && prescriptions.length === 0 && <p className="empty">No prescriptions are waiting to be dispensed.</p>}
      </section>

      {user.role === 'admin' && (
        <section className="card">
          <h2>Add medicine</h2>
          <form onSubmit={addMedicine}>
            <div className="grid-4">
              <div className="field"><label htmlFor="medicine-name">Medicine name</label><input id="medicine-name" required maxLength={160} value={newMedicine.name} onChange={(event) => setNewMedicine({ ...newMedicine, name: event.target.value })} /></div>
              <div className="field"><label htmlFor="medicine-strength">Strength</label><input id="medicine-strength" maxLength={80} value={newMedicine.strength} onChange={(event) => setNewMedicine({ ...newMedicine, strength: event.target.value })} /></div>
              <div className="field"><label htmlFor="medicine-form">Dosage form</label><input id="medicine-form" maxLength={60} placeholder="Tablet, capsule, syrup..." value={newMedicine.dosage_form} onChange={(event) => setNewMedicine({ ...newMedicine, dosage_form: event.target.value })} /></div>
              <div className="field"><label htmlFor="opening-stock">Opening stock</label><input id="opening-stock" type="number" min="0" step="1" required value={newMedicine.stock_quantity} onChange={(event) => setNewMedicine({ ...newMedicine, stock_quantity: event.target.value })} /></div>
              <div className="field"><label htmlFor="medicine-price">Price per unit</label><input id="medicine-price" type="number" min="0" step="0.01" required value={newMedicine.unit_price} onChange={(event) => setNewMedicine({ ...newMedicine, unit_price: event.target.value })} /></div>
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add medicine'}</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Medicine inventory</h2>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>Medicine</th><th>Stock</th><th>Unit price</th>{user.role === 'admin' && <th>Restock / update price</th>}</tr></thead>
            <tbody>
              {medicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td data-label="Medicine"><strong>{medicine.name}</strong> {medicine.strength} {medicine.dosage_form}{!medicine.is_active && <span className="badge badge-off">Inactive</span>}</td>
                  <td data-label="Stock">{medicine.stock_quantity}</td>
                  <td data-label="Unit price">{Number(medicine.unit_price).toFixed(2)}</td>
                  {user.role === 'admin' && (
                    <td data-label="Restock / update price">
                      {medicine.is_active ? (
                        <form className="inventory-edit" onSubmit={(event) => updateInventory(event, medicine)}>
                          <label>Stock to add<input aria-label={`Stock to add for ${medicine.name}`} type="number" min="0" step="1" value={inventoryEdits[medicine.id]?.stock_to_add ?? '0'} onChange={(event) => editInventory(medicine, 'stock_to_add', event.target.value)} /></label>
                          <label>New unit price<input aria-label={`New unit price for ${medicine.name}`} type="number" min="0" step="0.01" value={inventoryEdits[medicine.id]?.unit_price ?? medicine.unit_price} onChange={(event) => editInventory(medicine, 'unit_price', event.target.value)} /></label>
                          <button className="btn btn-ghost btn-small" disabled={saving}>Save</button>
                        </form>
                      ) : 'Inactive'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && medicines.length === 0 && <p className="empty">No medicines have been added to the catalog.</p>}
      </section>
    </>
  );
}
