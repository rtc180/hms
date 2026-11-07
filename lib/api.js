// Shared helpers for API routes: JSON replies, permission checks, CSRF defence.
import { NextResponse } from 'next/server';
import { getSession } from './auth';
import { query } from './db';

// Send a JSON reply
export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

// Send an error reply such as { "error": "Not allowed" }
export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Find the caller's IP address (works behind proxies such as Nginx or Vercel)
export function getIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

// CSRF defence: for requests that change data, the browser's Origin must match our own host.
function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Not a browser request (e.g. server to server)
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

// Permission gate. Call at the top of every protected route:
//   const { user, error } = await guard(request, ['admin', 'doctor']);
//   if (error) return error;
export async function guard(request, allowedRoles) {
  // 1. Block cross-site requests that try to change data
  const isReadOnly = ['GET', 'HEAD'].includes(request.method);
  if (!isReadOnly && !isSameOrigin(request)) {
    return { error: fail('Cross-site request blocked', 403) };
  }

  // 2. Must be logged in
  const session = await getSession();
  if (!session) return { error: fail('Please sign in to continue', 401) };

  // 3. Re-check the user in the database so disabled accounts or changed roles apply immediately
  const { rows } = await query(
    'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
    [session.id]
  );
  const user = rows[0];
  if (!user || !user.is_active) return { error: fail('This account is not active', 401) };

  // 4. Role must be on the allowed list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: fail('You do not have permission to do this', 403) };
  }

  // 5. All good
  return { user };
}

// Read a JSON request body safely. Returns null when the body is not valid JSON.
export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
