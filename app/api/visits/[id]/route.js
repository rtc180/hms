// PUT /api/visits/:id : update a visit
//   nurse  : may change vitals and complaint while the visit is still "waiting"
//   doctor / admin : may change everything, including diagnosis, treatment and status
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId } from '@/lib/validate';
import { validateVisit } from '@/lib/visitValidation';
import { writeAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  const { user, error } = await guard(request, ['admin', 'doctor', 'nurse']);
  if (error) return error;

  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid visit id');

  // Load the current visit
  const current = await query('SELECT * FROM visits WHERE id = $1', [id]);
  const existing = current.rows[0];
  if (!existing) return fail('Visit not found', 404);

  // Nurses cannot touch a visit once the doctor has finished it
  if (user.role === 'nurse' && existing.status === 'treated') {
    return fail('Treated visits can only be changed by a doctor', 403);
  }

  const body = await readBody(request);
  const { data, error: problem } = validateVisit(body, user.role, existing);
  if (problem) return fail(problem);

  // Record the treating doctor when the visit is closed, clear it if reopened
  let doctorId = existing.doctor_id;
  if (user.role !== 'nurse') {
    doctorId = data.status === 'treated' ? user.id : null;
  }

  await query(
    `UPDATE visits SET
       complaint=$1, temperature=$2, blood_pressure=$3, pulse=$4, weight=$5,
       diagnosis=$6, treatment=$7, status=$8, doctor_id=$9, updated_at=NOW()
     WHERE id=$10`,
    [
      data.complaint, data.temperature, data.blood_pressure || null, data.pulse, data.weight,
      data.diagnosis || null, data.treatment || null, data.status, doctorId, id,
    ]
  );

  await writeAudit(user.id, 'UPDATE', 'visit', id, null, getIp(request));
  return json({ ok: true });
}
