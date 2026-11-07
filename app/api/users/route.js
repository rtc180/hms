// GET  /api/users : list staff accounts (admin only)
// POST /api/users : create a staff account (admin only)
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, isEmail, isStrongPassword } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function GET(request) {
  const { error } = await guard(request, ['admin']);
  if (error) return error;

  // Never select password_hash here
  const { rows } = await query(
    `SELECT id, full_name, email, role, is_active, created_at
     FROM users ORDER BY created_at DESC`
  );
  return json({ users: rows });
}

export async function POST(request) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;

  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const full_name = clean(body.full_name, 120);
  const email = clean(body.email, 255).toLowerCase();
  const role = clean(body.role, 10);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!full_name) return fail('Enter the full name');
  if (!isEmail(email)) return fail('Enter a valid email address');
  if (!['admin', 'doctor', 'nurse'].includes(role)) return fail('Choose a role');
  if (!isStrongPassword(password)) {
    return fail('Password needs 8+ characters with upper case, lower case and a number');
  }

  // Email must be unique
  const taken = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (taken.rows[0]) return fail('That email is already in use', 409);

  // Hash the password before saving (12 = work factor)
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [full_name, email, hash, role]
  );

  await writeAudit(user.id, 'CREATE', 'user', rows[0].id, { role }, getIp(request));
  return json({ user: rows[0] }, 201);
}
