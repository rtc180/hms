// GET /api/prescriptions?visit_id=:id : visit prescriptions
// POST /api/prescriptions : prescribe medicines for a treated visit
import { pool } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId, clean } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function GET(request) {
  const { error } = await guard(request, ['admin', 'doctor', 'nurse']);
  if (error) return error;
  const visitId = toId(new URL(request.url).searchParams.get('visit_id'));
  if (!visitId) return fail('A valid visit id is required');

  const { rows } = await pool.query(
    `SELECT p.id, p.visit_id, p.medicine_id, p.dosage_instructions, p.quantity,
            p.status, p.prescribed_at, p.dispensed_at, p.unit_price_at_dispense,
            m.name AS medicine_name, m.strength, m.dosage_form,
            prescriber.full_name AS prescribed_by_name,
            dispenser.full_name AS dispensed_by_name
     FROM prescriptions p
     JOIN medicines m ON m.id = p.medicine_id
     LEFT JOIN users prescriber ON prescriber.id = p.prescribed_by
     LEFT JOIN users dispenser ON dispenser.id = p.dispensed_by
     WHERE p.visit_id = $1
     ORDER BY p.prescribed_at, p.id`,
    [visitId]
  );
  return json({ prescriptions: rows });
}

export async function POST(request) {
  const { user, error } = await guard(request, ['admin', 'doctor']);
  if (error) return error;
  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const visitId = toId(body.visit_id);
  if (!visitId || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return fail('Select a treated visit and one or more medicines');
  }
  const items = [];
  for (const item of body.items) {
    const medicineId = toId(item.medicine_id);
    const quantity = Number(item.quantity);
    const instructions = clean(item.dosage_instructions, 500);
    if (!medicineId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000 || !instructions) {
      return fail('Each prescription needs a medicine, valid quantity and dosage instructions');
    }
    items.push({ medicineId, quantity, instructions });
  }
  if (new Set(items.map((item) => item.medicineId)).size !== items.length) {
    return fail('Add each medicine once per prescription');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const visit = await client.query('SELECT id, status FROM visits WHERE id = $1 FOR UPDATE', [visitId]);
    if (!visit.rows[0]) {
      await client.query('ROLLBACK');
      return fail('Visit not found', 404);
    }
    if (visit.rows[0].status !== 'treated') {
      await client.query('ROLLBACK');
      return fail('Prescriptions can only be added to treated visits');
    }
    const medicineIds = items.map((item) => item.medicineId);
    const medicines = await client.query(
      'SELECT id FROM medicines WHERE id = ANY($1::int[]) AND is_active = TRUE',
      [medicineIds]
    );
    if (medicines.rows.length !== items.length) {
      await client.query('ROLLBACK');
      return fail('One or more selected medicines are no longer available');
    }
    const existingBill = await client.query('SELECT id FROM bills WHERE visit_id = $1', [visitId]);
    if (existingBill.rows[0]) {
      await client.query('ROLLBACK');
      return fail('This visit has already been billed', 409);
    }
    const created = [];
    for (const item of items) {
      const { rows } = await client.query(
        `INSERT INTO prescriptions
           (visit_id, medicine_id, dosage_instructions, quantity, prescribed_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [visitId, item.medicineId, item.instructions, item.quantity, user.id]
      );
      created.push(rows[0].id);
    }
    await client.query('COMMIT');
    await writeAudit(user.id, 'CREATE', 'prescription', created[0], { visitId, prescriptionIds: created }, getIp(request));
    return json({ prescriptionIds: created }, 201);
  } catch (transactionError) {
    await client.query('ROLLBACK');
    throw transactionError;
  } finally {
    client.release();
  }
}
