// GET /api/billing : visits ready to bill and existing bills
// POST /api/billing : create a bill for a treated visit (admin/nurse)
import { pool } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId, toNumberOrNull } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

const BILLING_STAFF = ['admin', 'nurse'];

export async function GET(request) {
  const { error } = await guard(request, BILLING_STAFF);
  if (error) return error;

  const [visits, bills] = await Promise.all([
    pool.query(
      `SELECT v.id AS visit_id, v.visit_date, v.diagnosis, v.complaint,
              p.patient_no, p.first_name, p.last_name,
              COUNT(pr.id) FILTER (WHERE pr.status = 'pending')::int AS pending_prescriptions
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN bills b ON b.visit_id = v.id
       LEFT JOIN prescriptions pr ON pr.visit_id = v.id
       WHERE v.status = 'treated' AND b.id IS NULL
       GROUP BY v.id, p.id
       ORDER BY v.visit_date DESC
       LIMIT 100`
    ),
    pool.query(
      `SELECT b.id, b.visit_id, b.consultation_fee, b.medication_total, b.total_amount,
              b.amount_paid, b.status, b.created_at,
              v.visit_date, p.patient_no, p.first_name, p.last_name,
              COALESCE(
                json_agg(json_build_object(
                  'id', bp.id, 'amount', bp.amount, 'payment_method', bp.payment_method,
                  'created_at', bp.created_at
                ) ORDER BY bp.created_at DESC) FILTER (WHERE bp.id IS NOT NULL),
                '[]'::json
              ) AS payments
       FROM bills b
       JOIN visits v ON v.id = b.visit_id
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN bill_payments bp ON bp.bill_id = b.id
       GROUP BY b.id, v.id, p.id
       ORDER BY b.created_at DESC
       LIMIT 200`
    ),
  ]);
  return json({ visits: visits.rows, bills: bills.rows });
}

export async function POST(request) {
  const { user, error } = await guard(request, BILLING_STAFF);
  if (error) return error;
  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const visitId = toId(body.visit_id);
  const consultationFee = toNumberOrNull(body.consultation_fee, 0, 100000000);
  if (!visitId) return fail('Select a valid visit');
  if (consultationFee === null || consultationFee === undefined) return fail('Enter a valid consultation fee');
  const fee = Math.round(consultationFee * 100) / 100;

  const client = await pool.connect();
  let bill;
  try {
    await client.query('BEGIN');
    const visit = await client.query(
      `SELECT v.id, v.status, p.patient_no, p.first_name, p.last_name
       FROM visits v JOIN patients p ON p.id = v.patient_id
       WHERE v.id = $1 FOR UPDATE OF v`,
      [visitId]
    );
    if (!visit.rows[0]) {
      await client.query('ROLLBACK');
      return fail('Visit not found', 404);
    }
    if (visit.rows[0].status !== 'treated') {
      await client.query('ROLLBACK');
      return fail('Only treated visits can be billed');
    }
    const pending = await client.query(
      "SELECT COUNT(*)::int AS count FROM prescriptions WHERE visit_id = $1 AND status = 'pending'",
      [visitId]
    );
    if (pending.rows[0].count > 0) {
      await client.query('ROLLBACK');
      return fail('Dispense all prescribed medicines before creating the bill');
    }
    const medication = await client.query(
      `SELECT COALESCE(SUM(quantity * unit_price_at_dispense), 0)::numeric(12,2) AS total
       FROM prescriptions WHERE visit_id = $1 AND status = 'dispensed'`,
      [visitId]
    );
    const medicationTotal = Number(medication.rows[0].total);
    const total = Math.round((fee + medicationTotal) * 100) / 100;
    const result = await client.query(
      `INSERT INTO bills (visit_id, consultation_fee, medication_total, total_amount, billed_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, visit_id, consultation_fee, medication_total, total_amount, amount_paid, status, created_at`,
      [visitId, fee, medicationTotal, total, user.id]
    );
    bill = result.rows[0];
    await client.query('COMMIT');
  } catch (transactionError) {
    await client.query('ROLLBACK');
    if (transactionError.code === '23505') return fail('This visit already has a bill', 409);
    throw transactionError;
  } finally {
    client.release();
  }
  await writeAudit(user.id, 'CREATE', 'bill', bill.id, { visitId, total: bill.total_amount }, getIp(request));
  return json({ bill }, 201);
}
