// PATCH /api/medicines/:id : update price or add stock (admin only)
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { toId, toNumberOrNull } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function PATCH(request, { params }) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;
  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid medicine id');
  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const stockToAdd = toNumberOrNull(body.stock_to_add, 0, 10000000);
  const unitPrice = toNumberOrNull(body.unit_price, 0, 100000000);
  if (stockToAdd === undefined || stockToAdd === null || !Number.isInteger(stockToAdd)) {
    return fail('Enter a valid whole-number stock addition');
  }
  if (unitPrice === undefined || unitPrice === null) return fail('Enter a valid non-negative unit price');

  const { rows } = await query(
    `UPDATE medicines
     SET stock_quantity = stock_quantity + $1, unit_price = $2, updated_at = NOW()
     WHERE id = $3 AND is_active = TRUE
     RETURNING id, name, strength, dosage_form, stock_quantity, unit_price, is_active`,
    [stockToAdd, unitPrice, id]
  );
  if (!rows[0]) return fail('Active medicine not found', 404);
  await writeAudit(user.id, 'UPDATE', 'medicine', id, { stockAdded: stockToAdd, unitPrice }, getIp(request));
  return json({ medicine: rows[0] });
}
