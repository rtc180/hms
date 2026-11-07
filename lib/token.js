// Creating and checking signed login tokens (JWT).
// This file uses only "jose" so that it can run inside Next.js middleware too.
import { SignJWT, jwtVerify } from 'jose';

// Name of the cookie that stores the token
export const COOKIE_NAME = 'gsmc_session';

// How long a login lasts
export const SESSION_HOURS = 8;

// Read the secret key from the environment and turn it into bytes
function getSecret() {
  const secret = process.env.JWT_SECRET;
  // Refuse to run with a missing or weak secret
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set in .env.local and be at least 32 characters long.');
  }
  return new TextEncoder().encode(secret);
}

// Create a signed token for a user who just logged in
export async function createToken(user) {
  return new SignJWT({
    id: user.id,          // Which user this token belongs to
    role: user.role,      // Their role (used by middleware for page protection)
    name: user.full_name, // Their display name
  })
    .setProtectedHeader({ alg: 'HS256' })          // Signing algorithm
    .setIssuedAt()                                 // When it was created
    .setExpirationTime(`${SESSION_HOURS}h`)        // When it stops working
    .sign(getSecret());                            // Sign with our secret
}

// Check a token. Returns its contents if valid, or null if forged/expired.
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null; // Invalid, tampered or expired
  }
}
