// GET /api/medicines : active medication catalog for prescribing
// POST /api/medicines : create a catalog item (admin only)
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, toNumberOrNull } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function GET(request) {
  const { error } = await guard(request, ['admin', 'doctor', 'nurse']);
  if (error) return error;
  const { rows } = await query(
    `SELECT id, name, strength, dosage_form, stock_quantity, unit_price, is_active
     FROM medicines WHERE is_active = TRUE ORDER BY LOWER(name), LOWER(strength)`
  );
  return json({ medicines: rows });
}

export async function POST(request) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;
  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const name = clean(body.name, 160);
  const strength = clean(body.strength, 80);
  const dosageForm = clean(body.dosage_form, 60);
  const stock = toNumberOrNull(body.stock_quantity, 0, 10000000);
  const price = toNumberOrNull(body.unit_price, 0, 100000000);
  if (!name || stock === null || stock === undefined || !Number.isInteger(stock)) {
    return fail('Enter a medicine name and a valid whole-number opening stock');
  }
  if (price === null || price === undefined) return fail('Enter a valid non-negative unit price');

  try {
    const { rows } = await query(
      `INSERT INTO medicines (name, strength, dosage_form, stock_quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, strength, dosage_form, stock_quantity, unit_price, is_active`,
      [name, strength, dosageForm, stock, price]
    );
    await writeAudit(user.id, 'CREATE', 'medicine', rows[0].id, { name, stock, price }, getIp(request));
    return json({ medicine: rows[0] }, 201);
  } catch (insertError) {
    if (insertError.code === '23505' && insertError.constraint === 'idx_medicines_unique_product') {
      return fail('That medicine, strength and form already exist', 409);
    }
    throw insertError;
  }
}
