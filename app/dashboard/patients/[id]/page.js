'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, formatDate, formatDateTime } from '@/lib/clientApi';
import { useUser } from '@/components/UserContext';
import PatientForm from '@/components/PatientForm';
import VisitForm from '@/components/VisitForm';
import ReportHeader from '@/components/ReportHeader';

export default function PatientFilePage() {
  const { id } = useParams();                       // Patient id from the address bar
  const router = useRouter();
  const user = useUser();

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [error, setError] = useState('');
  const [editingPatient, setEditingPatient] = useState(false);
  const [addingVisit, setAddingVisit] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState(null);   // Which visit is being edited
  const [prescribingVisitId, setPrescribingVisitId] = useState(null);
  const [prescriptionForm, setPrescriptionForm] = useState({ medicine_id: '', dosage_instructions: '', quantity: '1' });

  // Load the patient file
  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/patients/${id}`);
      setPatient(data.patient);
      setVisits(data.visits);
      setAdmissions(data.admissions);
      setPrescriptions(data.prescriptions);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user.role !== 'doctor' && user.role !== 'admin') return;
    apiFetch('/api/medicines')
      .then((data) => setMedicines(data.medicines))
      .catch((err) => setError(err.message));
  }, [user.role]);

  // Save changes to the patient's details
  async function savePatient(values) {
    await apiFetch(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(values) });
    setEditingPatient(false);
    load();
  }

  // Add a new visit
  async function addVisit(values) {
    await apiFetch('/api/visits', { method: 'POST', body: JSON.stringify({ ...values, patient_id: Number(id) }) });
    setAddingVisit(false);
    load();
  }

  // Update an existing visit
  async function updateVisit(visitId, values) {
    await apiFetch(`/api/visits/${visitId}`, { method: 'PUT', body: JSON.stringify(values) });
    setEditingVisitId(null);
    load();
  }

  async function addPrescription(event, visitId) {
    event.preventDefault();
    try {
      await apiFetch('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          visit_id: visitId,
          items: [{
            medicine_id: prescriptionForm.medicine_id,
            dosage_instructions: prescriptionForm.dosage_instructions,
            quantity: prescriptionForm.quantity,
          }],
        }),
      });
      setPrescribingVisitId(null);
      setPrescriptionForm({ medicine_id: '', dosage_instructions: '', quantity: '1' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Delete the patient (admin only)
  async function deletePatient() {
    const sure = window.confirm('Delete this patient and all of their visits? This cannot be undone.');
    if (!sure) return;
    try {
      await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
      router.push('/dashboard/patients');
    } catch (err) {
      setError(err.message);
    }
  }

  // A nurse may edit a visit only while it is still waiting; doctors and admins always may
  const canEditVisit = (visit) => user.role !== 'nurse' || visit.status === 'waiting';

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!patient) return <p className="empty">Loading...</p>;

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="page-head no-print">
        <div>
          <h1>{patient.first_name} {patient.last_name}</h1>
          <p>{patient.patient_no}</p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>Print patient summary</button>
          <button className="btn btn-ghost" onClick={() => setEditingPatient(!editingPatient)}>
            {editingPatient ? 'Close editor' : 'Edit details'}
          </button>
          {user.role === 'admin' && <button className="btn btn-danger" onClick={deletePatient}>Delete patient</button>}
        </div>
      </div>

      {editingPatient && (
        <div className="card no-print">
          <h2>Edit details</h2>
          <PatientForm initial={patient} onSubmit={savePatient} onCancel={() => setEditingPatient(false)} submitLabel="Save changes" />
        </div>
      )}

      {/* Everything inside this card is printable */}
      <div className="card">
        {/* The letterhead is shown on paper only, so it does not repeat on screen */}
        <div className="print-letterhead">
          <ReportHeader title={`Patient summary: ${patient.first_name} ${patient.last_name}`} />
        </div>

        <h2>Details</h2>
        <div className="grid-3">
          <p><strong>Gender</strong><br />{patient.gender}</p>
          <p><strong>Age</strong><br />{patient.age} years ({formatDate(patient.date_of_birth)})</p>
          <p><strong>Blood group</strong><br />{patient.blood_group || 'Unknown'}</p>
          <p><strong>Phone</strong><br />{patient.phone || '-'}</p>
          <p><strong>National ID</strong><br />{patient.national_id || '-'}</p>
          <p><strong>Allergies</strong><br />{patient.allergies || 'None recorded'}</p>
          <p><strong>Address</strong><br />{patient.address || '-'}</p>
          <p><strong>Next of kin</strong><br />{patient.next_of_kin_name || '-'}</p>
          <p><strong>Next of kin phone</strong><br />{patient.next_of_kin_phone || '-'}</p>
        </div>
      </div>

      <div className="card">
        <div className="page-head">
          <h2>Visits ({visits.length})</h2>
          <button className="btn btn-primary no-print" onClick={() => setAddingVisit(!addingVisit)}>
            {addingVisit ? 'Close' : 'Record new visit'}
          </button>
        </div>

        {addingVisit && (
          <div className="card no-print form-panel">
            <VisitForm onSubmit={addVisit} onCancel={() => setAddingVisit(false)} submitLabel="Save visit" />
          </div>
        )}

        {visits.length === 0 && <p className="empty">No visits yet. Record the first visit above.</p>}

        {visits.map((visit) => (
          <div key={visit.id} className="card" style={{ marginBottom: '0.75rem' }}>
            {editingVisitId === visit.id ? (
              <VisitForm
                initial={visit}
                onSubmit={(values) => updateVisit(visit.id, values)}
                onCancel={() => setEditingVisitId(null)}
                submitLabel="Save changes"
              />
            ) : (
              <>
                <div className="page-head" style={{ marginBottom: '0.5rem' }}>
                  <div>
                    <strong>{formatDateTime(visit.visit_date)}</strong>{' '}
                    <span className={`badge badge-${visit.status}`}>{visit.status === 'treated' ? 'Treated' : 'Waiting'}</span>
                  </div>
                  {canEditVisit(visit) && (
                    <button className="btn btn-ghost btn-small no-print" onClick={() => setEditingVisitId(visit.id)}>Edit</button>
                  )}
                </div>
                <p><strong>Reason:</strong> {visit.complaint}</p>
                <p>
                  <strong>Vitals:</strong>{' '}
                  Temp {visit.temperature ?? '-'} °C | BP {visit.blood_pressure || '-'} |
                  Pulse {visit.pulse ?? '-'} bpm | Weight {visit.weight ?? '-'} kg
                </p>
                <p><strong>Diagnosis:</strong> {visit.diagnosis || 'Not yet diagnosed'}</p>
                {visit.treatment && <p><strong>Treatment:</strong> {visit.treatment}</p>}
                <div className="prescription-list">
                  <strong>Prescriptions</strong>
                  {(prescriptions.filter((item) => item.visit_id === visit.id)).length === 0 && <p className="hint">No medicine prescriptions.</p>}
                  {prescriptions.filter((item) => item.visit_id === visit.id).map((item) => (
                    <p className="prescription-line" key={item.id}>
                      {item.medicine_name} {item.strength} {item.dosage_form} · {item.dosage_instructions} · Qty {item.quantity}
                      <span className={`badge ${item.status === 'dispensed' ? 'badge-treated' : 'badge-waiting'}`}>{item.status}</span>
                    </p>
                  ))}
                </div>
                {(user.role === 'doctor' || user.role === 'admin') && visit.status === 'treated' && (
                  <div className="no-print">
                    {prescribingVisitId === visit.id ? (
                      <form className="prescription-form" onSubmit={(event) => addPrescription(event, visit.id)}>
                        <div className="grid-2">
                          <div className="field">
                            <label htmlFor={`prescription-medicine-${visit.id}`}>Medicine</label>
                            <select id={`prescription-medicine-${visit.id}`} required value={prescriptionForm.medicine_id} onChange={(event) => setPrescriptionForm({ ...prescriptionForm, medicine_id: event.target.value })}>
                              <option value="">Select medicine</option>
                              {medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} {medicine.strength} {medicine.dosage_form}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`prescription-quantity-${visit.id}`}>Quantity</label>
                            <input id={`prescription-quantity-${visit.id}`} type="number" min="1" max="10000" required value={prescriptionForm.quantity} onChange={(event) => setPrescriptionForm({ ...prescriptionForm, quantity: event.target.value })} />
                          </div>
                        </div>
                        <div className="field">
                          <label htmlFor={`prescription-instructions-${visit.id}`}>Dosage instructions</label>
                          <input id={`prescription-instructions-${visit.id}`} required maxLength={500} placeholder="e.g. Take one tablet twice daily after meals" value={prescriptionForm.dosage_instructions} onChange={(event) => setPrescriptionForm({ ...prescriptionForm, dosage_instructions: event.target.value })} />
                        </div>
                        <div className="actions">
                          <button className="btn btn-primary btn-small">Send to pharmacy</button>
                          <button type="button" className="btn btn-ghost btn-small" onClick={() => setPrescribingVisitId(null)}>Cancel</button>
                        </div>
                        {medicines.length === 0 && <p className="hint">Ask an administrator to add medicines to the pharmacy catalog first.</p>}
                      </form>
                    ) : (
                      <button className="btn btn-ghost btn-small" onClick={() => setPrescribingVisitId(visit.id)}>Add prescription</button>
                    )}
                  </div>
                )}
                <p className="hint">
                  Recorded by {visit.nurse_name || 'unknown'}
                  {visit.doctor_name ? ` | Treated by ${visit.doctor_name}` : ''}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Inpatient admissions ({admissions.length})</h2>
        {admissions.length === 0 && <p className="empty">No inpatient admissions recorded.</p>}
        {admissions.map((admission) => (
          <div key={admission.id} className="card" style={{ marginBottom: '0.75rem' }}>
            <div className="page-head" style={{ marginBottom: '0.5rem' }}>
              <div>
                <strong>{admission.ward} / bed {admission.bed_number}</strong>{' '}
                <span className={`badge ${admission.status === 'admitted' ? 'badge-waiting' : 'badge-treated'}`}>
                  {admission.status}
                </span>
              </div>
            </div>
            <p><strong>Admitted:</strong> {formatDateTime(admission.admitted_at)}</p>
            <p><strong>Reason:</strong> {admission.reason}</p>
            {admission.diagnosis && <p><strong>Diagnosis:</strong> {admission.diagnosis}</p>}
            {admission.discharged_at && <p><strong>Discharged:</strong> {formatDateTime(admission.discharged_at)}</p>}
            {admission.discharge_notes && <p><strong>Discharge notes:</strong> {admission.discharge_notes}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
