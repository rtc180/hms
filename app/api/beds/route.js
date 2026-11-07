// GET /api/beds : bed map and current occupancy
// POST /api/beds : add a ward bed (admin only)
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

const STAFF = ['admin', 'doctor', 'nurse'];

export async function GET(request) {
  const { error } = await guard(request, STAFF);
  if (error) return error;

  const { rows } = await query(
    `SELECT b.id, b.ward, b.bed_number, b.is_active,
            a.id AS admission_id, a.patient_id, p.patient_no,
            p.first_name, p.last_name,
            CASE WHEN a.id IS NULL THEN 'available' ELSE 'occupied' END AS status
     FROM beds b
     LEFT JOIN admissions a ON a.bed_id = b.id AND a.status = 'admitted'
     LEFT JOIN patients p ON p.id = a.patient_id
     ORDER BY LOWER(b.ward), b.bed_number`
  );
  return json({ beds: rows });
}

export async function POST(request) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;

  const body = await readBody(request);
  if (!body) return fail('Invalid request');
  const ward = clean(body.ward, 80);
  const bedNumber = clean(body.bed_number, 20);
  if (!ward || !bedNumber) return fail('Ward and bed number are required');

  try {
    const { rows } = await query(
      `INSERT INTO beds (ward, bed_number) VALUES ($1, $2)
       RETURNING id, ward, bed_number, is_active`,
      [ward, bedNumber]
    );
    await writeAudit(user.id, 'CREATE', 'bed', rows[0].id, { ward, bedNumber }, getIp(request));
    return json({ bed: rows[0] }, 201);
  } catch (insertError) {
    if (insertError.code === '23505' && insertError.constraint === 'idx_beds_ward_number') {
      return fail('That bed already exists in this ward', 409);
    }
    throw insertError;
  }
}
