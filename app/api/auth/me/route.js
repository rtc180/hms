// GET /api/auth/me : who am I? (used by the interface to show the right menu)
import { guard, json } from '@/lib/api';

export async function GET(request) {
  const { user, error } = await guard(request);       // Any logged-in role may call this
  if (error) return error;
  return json({ user: { id: user.id, name: user.full_name, email: user.email, role: user.role } });
}
