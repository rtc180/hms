// PATCH /api/prescriptions/:id : dispense a prescribed medicine (nurse/admin)
import { pool } from '@/lib/db';
import { guard, json, fail, getIp } from '@/lib/api';
import { toId } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function PATCH(request, { params }) {
  const { user, error } = await guard(request, ['admin', 'nurse']);
  if (error) return error;
  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid prescription id');

  const client = await pool.connect();
  let auditDetails;
  try {
    await client.query('BEGIN');
    const prescription = await client.query(
      `SELECT p.id, p.medicine_id, p.quantity, p.status, m.name AS medicine_name,
              m.stock_quantity, m.unit_price
       FROM prescriptions p
       JOIN medicines m ON m.id = p.medicine_id
       WHERE p.id = $1
       FOR UPDATE OF p, m`,
      [id]
    );
    const item = prescription.rows[0];
    if (!item) {
      await client.query('ROLLBACK');
      return fail('Prescription not found', 404);
    }
    if (item.status !== 'pending') {
      await client.query('ROLLBACK');
      return fail('This prescription has already been dispensed', 409);
    }
    if (item.stock_quantity < item.quantity) {
      await client.query('ROLLBACK');
      return fail(`Insufficient stock for ${item.medicine_name}`, 409);
    }

    await client.query(
      'UPDATE medicines SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2',
      [item.quantity, item.medicine_id]
    );
    await client.query(
      `UPDATE prescriptions
       SET status = 'dispensed', dispensed_by = $1, dispensed_at = NOW(),
           unit_price_at_dispense = $2
       WHERE id = $3`,
      [user.id, item.unit_price, id]
    );
    await client.query('COMMIT');
    auditDetails = { medicine: item.medicine_name, quantity: item.quantity };
  } catch (transactionError) {
    await client.query('ROLLBACK');
    throw transactionError;
  } finally {
    client.release();
  }

  await writeAudit(user.id, 'DISPENSE', 'prescription', id, auditDetails, getIp(request));
  return json({ ok: true });
}
