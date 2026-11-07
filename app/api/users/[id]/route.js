// PUT /api/users/:id : edit a staff account, change its role, disable it or reset its password
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, toId, isStrongPassword } from '@/lib/validate';
import { writeAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;

  const { id: rawId } = await params;
  const id = toId(rawId);
  if (!id) return fail('Invalid user id');

  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const full_name = clean(body.full_name, 120);
  const role = clean(body.role, 10);
  const is_active = body.is_active === true;
  const newPassword = typeof body.password === 'string' ? body.password : '';

  if (!full_name) return fail('Enter the full name');
  if (!['admin', 'doctor', 'nurse'].includes(role)) return fail('Choose a role');

  // An admin must not lock themselves out
  if (id === user.id && (!is_active || role !== 'admin')) {
    return fail('You cannot disable your own account or remove your own admin role');
  }

  // Update the basic fields and clear any lock
  const { rowCount } = await query(
    `UPDATE users SET full_name=$1, role=$2, is_active=$3,
       failed_attempts = 0, locked_until = NULL WHERE id=$4`,
    [full_name, role, is_active, id]
  );
  if (!rowCount) return fail('User not found', 404);

  // Optional password reset
  if (newPassword) {
    if (!isStrongPassword(newPassword)) {
      return fail('Password needs 8+ characters with upper case, lower case and a number');
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, id]);
  }

  await writeAudit(user.id, 'UPDATE', 'user', id, { role, is_active, passwordReset: !!newPassword }, getIp(request));
  return json({ ok: true });
}
