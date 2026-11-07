// POST /api/visits : open a new visit for a patient (nurse records vitals, doctor may diagnose)
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId } from '@/lib/validate';
import { validateVisit } from '@/lib/visitValidation';
import { writeAudit } from '@/lib/audit';

export async function POST(request) {
  const { user, error } = await guard(request, ['admin', 'doctor', 'nurse']);
  if (error) return error;

  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  // Which patient is this visit for?
  const patientId = toId(body.patient_id);
  if (!patientId) return fail('Invalid patient');

  // Make sure the patient exists
  const exists = await query('SELECT id FROM patients WHERE id = $1', [patientId]);
  if (!exists.rows[0]) return fail('Patient not found', 404);

  // Validate the visit; the role decides which fields are accepted
  const { data, error: problem } = validateVisit(body, user.role);
  if (problem) return fail(problem);

  // If a doctor closes the visit straight away, record them as the treating doctor
  const doctorId = data.status === 'treated' ? user.id : null;

  const { rows } = await query(
    `INSERT INTO visits
       (patient_id, complaint, temperature, blood_pressure, pulse, weight,
        diagnosis, treatment, status, recorded_by, doctor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      patientId, data.complaint, data.temperature, data.blood_pressure || null,
      data.pulse, data.weight, data.diagnosis || null, data.treatment || null,
      data.status, user.id, doctorId,
    ]
  );

  await writeAudit(user.id, 'CREATE', 'visit', rows[0].id, { patientId }, getIp(request));
  return json({ visit: rows[0] }, 201);
}
