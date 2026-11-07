// GET /api/organization : current report letterhead details
// PUT /api/organization : update company details (admin only)
import { query } from '@/lib/db';
import { guard, json, fail, readBody, getIp } from '@/lib/api';
import { clean, isEmail } from '@/lib/validate';
import { organization } from '@/config/organization';
import { writeAudit } from '@/lib/audit';

const STAFF = ['admin', 'doctor', 'nurse'];
const SETTINGS_COLUMNS = `name, short_name AS "shortName", tagline, address,
                          phone, email, website, registration`;

export async function GET(request) {
  const { error } = await guard(request, STAFF);
  if (error) return error;

  const { rows } = await query(`SELECT ${SETTINGS_COLUMNS} FROM organization_settings WHERE id = 1`);
  return json({ organization: rows[0] || organization });
}

export async function PUT(request) {
  const { user, error } = await guard(request, ['admin']);
  if (error) return error;

  const body = await readBody(request);
  if (!body) return fail('Invalid request');

  const settings = {
    name: clean(body.name, 160),
    shortName: clean(body.shortName, 40),
    tagline: clean(body.tagline, 200),
    address: clean(body.address, 255),
    phone: clean(body.phone, 40),
    email: clean(body.email, 255).toLowerCase(),
    website: clean(body.website, 255),
    registration: clean(body.registration, 100),
  };
  if (!settings.name || !settings.shortName || !settings.address || !settings.phone || !settings.email) {
    return fail('Name, short name, address, phone and email are required');
  }
  if (!isEmail(settings.email)) return fail('Enter a valid company email address');

  const { rows } = await query(
    `INSERT INTO organization_settings
       (id, name, short_name, tagline, address, phone, email, website, registration, updated_at, updated_by)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, short_name = EXCLUDED.short_name, tagline = EXCLUDED.tagline,
       address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email,
       website = EXCLUDED.website, registration = EXCLUDED.registration,
       updated_at = NOW(), updated_by = EXCLUDED.updated_by
     RETURNING ${SETTINGS_COLUMNS}`,
    [
      settings.name, settings.shortName, settings.tagline, settings.address,
      settings.phone, settings.email, settings.website, settings.registration, user.id,
    ]
  );

  await writeAudit(user.id, 'UPDATE', 'organization', 1, { name: settings.name }, getIp(request));
  return json({ organization: rows[0] });
}
