// PATCH /api/admissions/:id : discharge an inpatient
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, toId } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function PATCH(request, { params }) {
  const { user, error } = await guard(request, ['admin', 'doctor']);
  if (error) return error;

  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid admission id');

  const body = await readBody(request);
  if (!body) return fail('Invalid request');
  const dischargeNotes = clean(body.discharge_notes, 2000) || null;

  const { rows } = await query(
    `UPDATE admissions
     SET status = 'discharged', discharged_at = NOW(), discharged_by = $1, discharge_notes = $2
     WHERE id = $3 AND status = 'admitted'
     RETURNING id`,
    [user.id, dischargeNotes, id]
  );
  if (!rows[0]) return fail('Active admission not found', 404);

  await writeAudit(user.id, 'UPDATE', 'admission', id, { status: 'discharged' }, getIp(request));
  return json({ ok: true });
}
