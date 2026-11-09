import bcrypt from 'bcryptjs';
import pg from 'pg';
import { getDatabaseConfig } from '../lib/database-config.mjs';

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || name.length > 120) {
  throw new Error('Set ADMIN_NAME to the administrator name (maximum 120 characters).');
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Set ADMIN_EMAIL to a valid email address.');
}
if (
  !password ||
  password.length < 8 ||
  password.length > 100 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/\d/.test(password)
) {
  throw new Error('ADMIN_PASSWORD must be 8–100 characters and include upper case, lower case, and a number.');
}

const client = new pg.Client(getDatabaseConfig());

try {
  await client.connect();
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await client.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [name, email, hash]
  );

  if (!rows[0]) {
    throw new Error(`An account already exists for ${email}; no password was changed.`);
  }

  console.log(`Administrator account created for ${email}.`);
} catch (error) {
  console.error('Could not create the administrator:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
