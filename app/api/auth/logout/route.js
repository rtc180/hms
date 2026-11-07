// POST /api/auth/logout : end the session.
import { clearSessionCookie, getSession } from '@/lib/auth';
import { json, getIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';

export async function POST(request) {
  const session = await getSession();                 // Who is leaving?
  await clearSessionCookie();                         // Delete their cookie
  if (session) await writeAudit(session.id, 'LOGOUT', 'user', session.id, null, getIp(request));
  return json({ ok: true });
}
