// POST /api/billing/:id/payments : record a payment (admin/nurse)
import { pool } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'insurance', 'other'];

export async function POST(request, { params }) {
  const { user, error } = await guard(request, ['admin', 'nurse']);
  if (error) return error;
  const { id: rawId } = await params;
  const billId = toId(rawId);
  if (!billId) return fail('Invalid bill id');
  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const amountText = typeof body.amount === 'string' ? body.amount : String(body.amount ?? '');
  const amount = Number(amountText);
  const method = typeof body.payment_method === 'string' ? body.payment_method : '';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0) {
    return fail('Enter a valid payment amount (maximum two decimal places)');
  }
  if (!PAYMENT_METHODS.includes(method)) return fail('Select a valid payment method');

  const client = await pool.connect();
  let paymentId;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM bills WHERE id = $1 FOR UPDATE', [billId]);
    const bill = rows[0];
    if (!bill) {
      await client.query('ROLLBACK');
      return fail('Bill not found', 404);
    }
    const remaining = Math.round((Number(bill.total_amount) - Number(bill.amount_paid)) * 100) / 100;
    if (amount > remaining) {
      await client.query('ROLLBACK');
      return fail(`Payment exceeds the outstanding balance of ${remaining.toFixed(2)}`);
    }
    const payment = await client.query(
      `INSERT INTO bill_payments (bill_id, amount, payment_method, received_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [billId, amount, method, user.id]
    );
    paymentId = payment.rows[0].id;
    const paid = Math.round((Number(bill.amount_paid) + amount) * 100) / 100;
    const status = paid === Number(bill.total_amount) ? 'paid' : 'partial';
    await client.query(
      'UPDATE bills SET amount_paid = $1, status = $2 WHERE id = $3',
      [paid, status, billId]
    );
    await client.query('COMMIT');
  } catch (transactionError) {
    await client.query('ROLLBACK');
    throw transactionError;
  } finally {
    client.release();
  }
  await writeAudit(user.id, 'PAYMENT', 'bill', billId, { paymentId, amount, method }, getIp(request));
  return json({ ok: true, paymentId });
}
