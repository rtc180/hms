// POST /api/auth/login : check email + password and start a session.
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createToken } from '@/lib/token';
import { setSessionCookie } from '@/lib/auth';
import { fail, json, getIp, readBody } from '@/lib/api';
import { clean } from '@/lib/validate';
import { rateLimit } from '@/lib/rateLimit';
import { writeAudit } from '@/lib/audit';

// A fake hash. When the email is unknown we still compare against it so the response time
// is the same as for a real user. This stops attackers discovering which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// One message for every failure, so we never reveal whether the email or the password was wrong
const GENERIC_ERROR = 'Incorrect email or password';

const MAX_ATTEMPTS = 5;      // Wrong passwords allowed before the account locks
const LOCK_MINUTES = 15;     // How long the lock lasts

export async function POST(request) {
  const ip = getIp(request);

  // 1. Slow down guessing: at most 10 attempts per IP every 15 minutes
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return fail(`Too many attempts. Try again in ${limit.retryAfter} seconds.`, 429);
  }

  // 2. Read and clean the form values
  const body = await readBody(request);
  if (!body) return fail('Invalid request');
  const email = clean(body.email, 255).toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 100) : '';
  if (!email || !password) return fail('Enter your email and password');

  // 3. Look the user up
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Unknown email: do a pretend comparison, then give the generic error
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return fail(GENERIC_ERROR, 401);
  }

  // 4. Is the account temporarily locked?
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return fail('This account is temporarily locked. Try again later.', 423);
  }

  // 5. Is the account disabled by an admin?
  if (!user.is_active) {
    return fail('This account has been disabled. Contact an administrator.', 403);
  }

  // 6. Compare the password with the stored hash
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      // Lock the account and reset the counter
      await query(
        `UPDATE users SET failed_attempts = 0,
           locked_until = NOW() + make_interval(mins => $2) WHERE id = $1`,
        [user.id, LOCK_MINUTES]
      );
      await writeAudit(user.id, 'ACCOUNT_LOCKED', 'user', user.id, null, ip);
    } else {
      await query('UPDATE users SET failed_attempts = $2 WHERE id = $1', [user.id, attempts]);
    }
    return fail(GENERIC_ERROR, 401);
  }

  // 7. Success: clear the failure counters, create the session cookie
  await query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
  const token = await createToken(user);
  await setSessionCookie(token);
  await writeAudit(user.id, 'LOGIN', 'user', user.id, null, ip);

  // 8. Tell the browser who just logged in (never send the hash!)
  return json({ user: { id: user.id, name: user.full_name, role: user.role } });
}
