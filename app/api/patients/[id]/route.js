// GET    /api/patients/:id : one patient with their visits and admission history
// PUT    /api/patients/:id : update patient details
// DELETE /api/patients/:id : delete a patient (admin only)
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId } from '@/lib/validate';
import { validatePatient } from '@/lib/patientValidation';
import { writeAudit } from '@/lib/audit';

const ALL_STAFF = ['admin', 'doctor', 'nurse'];

export async function GET(request, { params }) {
  const { user, error } = await guard(request, ALL_STAFF);
  if (error) return error;

  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid patient id');

  // The patient
  const patientResult = await query(
    `SELECT *, DATE_PART('year', AGE(date_of_birth))::int AS age FROM patients WHERE id = $1`,
    [id]
  );
  if (!patientResult.rows[0]) return fail('Patient not found', 404);

  // Their visits, newest first, with nurse and doctor names
  const visitResult = await query(
    `SELECT v.*, n.full_name AS nurse_name, d.full_name AS doctor_name
     FROM visits v
     LEFT JOIN users n ON n.id = v.recorded_by
     LEFT JOIN users d ON d.id = v.doctor_id
     WHERE v.patient_id = $1
     ORDER BY v.visit_date DESC`,
    [id]
  );

  const admissionResult = await query(
    `SELECT a.*, admitted_by.full_name AS admitted_by_name,
            discharged_by.full_name AS discharged_by_name
     FROM admissions a
     LEFT JOIN users admitted_by ON admitted_by.id = a.admitted_by
     LEFT JOIN users discharged_by ON discharged_by.id = a.discharged_by
     WHERE a.patient_id = $1
     ORDER BY a.admitted_at DESC`,
    [id]
  );

  const prescriptionResult = await query(
    `SELECT pr.id, pr.visit_id, pr.medicine_id, pr.dosage_instructions, pr.quantity,
            pr.status, pr.prescribed_at, pr.dispensed_at, pr.unit_price_at_dispense,
            m.name AS medicine_name, m.strength, m.dosage_form,
            prescriber.full_name AS prescribed_by_name,
            dispenser.full_name AS dispensed_by_name
     FROM prescriptions pr
     JOIN visits v ON v.id = pr.visit_id
     JOIN medicines m ON m.id = pr.medicine_id
     LEFT JOIN users prescriber ON prescriber.id = pr.prescribed_by
     LEFT JOIN users dispenser ON dispenser.id = pr.dispensed_by
     WHERE v.patient_id = $1
     ORDER BY pr.prescribed_at DESC`,
    [id]
  );

  // Record that this person viewed the file
  await writeAudit(user.id, 'VIEW', 'patient', id, null, getIp(request));

  return json({
    patient: patientResult.rows[0],
    visits: visitResult.rows,
    admissions: admissionResult.rows,
    prescriptions: prescriptionResult.rows,
  });
}

export async function PUT(request, { params }) {
  const { user, error } = await guard(request, ALL_STAFF);
  if (error) return error;

  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid patient id');

  const body = await readBody(request);
  const { data, error: problem } = validatePatient(body);
  if (problem) return fail(problem);

  const { rowCount } = await query(
    `UPDATE patients SET
       first_name=$1, last_name=$2, gender=$3, date_of_birth=$4, national_id=$5, phone=$6,
       address=$7, blood_group=$8, allergies=$9, next_of_kin_name=$10, next_of_kin_phone=$11,
       updated_at = NOW()
     WHERE id = $12`,
    [
      data.first_name, data.last_name, data.gender, data.date_of_birth,
      data.national_id || null, data.phone || null, data.address || null,
      data.blood_group || null, data.allergies || null,
      data.next_of_kin_name || null, data.next_of_kin_phone || null, id,
    ]
  );
  if (!rowCount) return fail('Patient not found', 404);

  await writeAudit(user.id, 'UPDATE', 'patient', id, null, getIp(request));
  return json({ ok: true });
}

export async function DELETE(request, { params }) {
  // Only admins may delete medical records
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;

  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid patient id');

  const { rowCount } = await query('DELETE FROM patients WHERE id = $1', [id]);
  if (!rowCount) return fail('Patient not found', 404);

  await writeAudit(user.id, 'DELETE', 'patient', id, null, getIp(request));
  return json({ ok: true });
}
