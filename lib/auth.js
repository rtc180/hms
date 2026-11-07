// Reading and writing the session cookie. Used by API routes and server components.
import { cookies } from 'next/headers';
import { COOKIE_NAME, SESSION_HOURS, verifyToken } from './token';

// Store the token in a secure cookie
export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,                                   // JavaScript in the browser cannot read it (blocks XSS theft)
    secure: process.env.NODE_ENV === 'production',    // Only sent over HTTPS in production
    sameSite: 'strict',                               // Never sent from other websites (blocks CSRF)
    path: '/',                                        // Valid for the whole site
    maxAge: SESSION_HOURS * 60 * 60,                  // Lifetime in seconds
  });
}

// Remove the cookie (logout)
export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

// Get the logged-in user's token contents, or null when nobody is logged in
export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
