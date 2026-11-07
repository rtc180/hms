// GET  /api/patients : search and list patients (paged)
// POST /api/patients : register a new patient
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, escapeLike, toId } from '@/lib/validate';
import { validatePatient } from '@/lib/patientValidation';
import { writeAudit } from '@/lib/audit';

const ALL_STAFF = ['admin', 'doctor', 'nurse'];
const PAGE_SIZE = 15;

export async function GET(request) {
  const { error } = await guard(request, ALL_STAFF);
  if (error) return error;

  const { searchParams } = new URL(request.url);

  // Read the search box and filters
  const q = clean(searchParams.get('q'), 100);
  const gender = clean(searchParams.get('gender'), 10);
  const page = toId(searchParams.get('page')) || 1;

  const conditions = [];
  const params = [];

  // Text search on name, patient number, phone or national ID
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(first_name ILIKE ${p} OR last_name ILIKE ${p}
        OR (first_name || ' ' || last_name) ILIKE ${p}
        OR patient_no ILIKE ${p} OR phone ILIKE ${p} OR national_id ILIKE ${p})`
    );
  }

  // Gender filter
  if (['Male', 'Female', 'Other'].includes(gender)) {
    params.push(gender);
    conditions.push(`gender = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Add LIMIT and OFFSET as parameters too
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const { rows } = await query(
    `SELECT id, patient_no, first_name, last_name, gender, date_of_birth, phone,
            DATE_PART('year', AGE(date_of_birth))::int AS age,
            COUNT(*) OVER()::int AS total
     FROM patients
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return json({
    patients: rows,
    total: rows.length ? rows[0].total : 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

export async function POST(request) {
  const { user, error } = await guard(request, ALL_STAFF);
  if (error) return error;

  // Validate everything the browser sent
  const body = await readBody(request);
  const { data, error: problem } = validatePatient(body);
  if (problem) return fail(problem);

  const { rows } = await query(
    `INSERT INTO patients
       (first_name, last_name, gender, date_of_birth, national_id, phone, address,
        blood_group, allergies, next_of_kin_name, next_of_kin_phone, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id, patient_no`,
    [
      data.first_name, data.last_name, data.gender, data.date_of_birth,
      data.national_id || null, data.phone || null, data.address || null,
      data.blood_group || null, data.allergies || null,
      data.next_of_kin_name || null, data.next_of_kin_phone || null, user.id,
    ]
  );

  await writeAudit(user.id, 'CREATE', 'patient', rows[0].id, null, getIp(request));
  return json({ patient: rows[0] }, 201);
}
