// GET /api/admissions : list inpatient stays
// POST /api/admissions : admit a patient to a ward and bed
import { pool, query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, escapeLike, toId } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

const ALL_STAFF = ['admin', 'doctor', 'nurse'];
const PAGE_SIZE = 20;

export async function GET(request) {
  const { user, error } = await guard(request, ALL_STAFF);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = clean(searchParams.get('status'), 12) || 'admitted';
  const search = clean(searchParams.get('q'), 100);
  const page = toId(searchParams.get('page')) || 1;
  if (!['admitted', 'discharged', 'all'].includes(status)) return fail('Invalid admission status');

  const conditions = [];
  const params = [];
  if (status !== 'all') {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const placeholder = `$${params.length}`;
    conditions.push(`(
      p.patient_no ILIKE ${placeholder} OR p.first_name ILIKE ${placeholder}
      OR p.last_name ILIKE ${placeholder}
      OR (p.first_name || ' ' || p.last_name) ILIKE ${placeholder}
      OR a.ward ILIKE ${placeholder} OR a.bed_number ILIKE ${placeholder}
    )`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const { rows } = await query(
    `SELECT a.id, a.patient_id, a.ward, a.bed_number, a.reason, a.diagnosis,
            a.status, a.admitted_at, a.discharged_at, a.discharge_notes,
            p.patient_no, p.first_name, p.last_name,
            admitted_by.full_name AS admitted_by_name,
            discharged_by.full_name AS discharged_by_name,
            COUNT(*) OVER()::int AS total
     FROM admissions a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users admitted_by ON admitted_by.id = a.admitted_by
     LEFT JOIN users discharged_by ON discharged_by.id = a.discharged_by
     ${where}
     ORDER BY a.admitted_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  await writeAudit(user.id, 'VIEW', 'admission', null, { status, page }, getIp(request));
  return json({
    admissions: rows,
    total: rows.length ? rows[0].total : 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

export async function POST(request) {
  const { user, error } = await guard(request, ALL_STAFF);
  if (error) return error;

  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const patientId = toId(body.patient_id);
  const bedId = Number(body.bed_id);
  const reason = clean(body.reason, 500);
  if (!patientId) return fail('Select a valid patient');
  if (!Number.isInteger(bedId) || bedId < 1 || !reason) return fail('Select an available bed and enter the reason for admission');

  const patient = await query('SELECT id FROM patients WHERE id = $1', [patientId]);
  if (!patient.rows[0]) return fail('Patient not found', 404);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: bedRows } = await client.query(
      'SELECT id, ward, bed_number FROM beds WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [bedId]
    );
    const bed = bedRows[0];
    if (!bed) {
      await client.query('ROLLBACK');
      return fail('Selected bed is not available', 409);
    }
    const { rows } = await client.query(
      `INSERT INTO admissions (patient_id, bed_id, ward, bed_number, reason, admitted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [patientId, bedId, bed.ward, bed.bed_number, reason, user.id]
    );
    await client.query('COMMIT');
    await writeAudit(user.id, 'CREATE', 'admission', rows[0].id, { patientId, ward: bed.ward, bedNumber: bed.bed_number }, getIp(request));
    return json({ admission: rows[0] }, 201);
  } catch (insertError) {
    await client.query('ROLLBACK');
    if (insertError.code === '23505' && insertError.constraint === 'idx_admissions_active_patient') {
      return fail('This patient already has an active admission', 409);
    }
    if (insertError.code === '23505' && insertError.constraint === 'idx_admissions_active_bed') {
      return fail('That bed is already occupied', 409);
    }
    throw insertError;
  } finally {
    client.release();
  }
}
