// PATCH /api/beds/:id : activate or deactivate a bed (admin only)
import { pool } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function PATCH(request, { params }) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;
  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid bed id');

  const body = await readBody(request);
  if (!body || typeof body.is_active !== 'boolean') return fail('Choose whether the bed is active');

  const client = await pool.connect();
  let bed;
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT id FROM beds WHERE id = $1 FOR UPDATE', [id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return fail('Bed not found', 404);
    }
    if (!body.is_active) {
      const occupied = await client.query(
        `SELECT id FROM admissions WHERE bed_id = $1 AND status = 'admitted'`,
        [id]
      );
      if (occupied.rows[0]) {
        await client.query('ROLLBACK');
        return fail('Discharge the patient before deactivating this bed', 409);
      }
    }
    const updated = await client.query(
      'UPDATE beds SET is_active = $1 WHERE id = $2 RETURNING id, ward, bed_number, is_active',
      [body.is_active, id]
    );
    bed = updated.rows[0];
    await client.query('COMMIT');
  } catch (transactionError) {
    await client.query('ROLLBACK');
    throw transactionError;
  } finally {
    client.release();
  }
  await writeAudit(user.id, 'UPDATE', 'bed', id, { is_active: body.is_active }, getIp(request));
  return json({ bed });
}
