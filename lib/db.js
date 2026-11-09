// Database connection shared by every API route.
import { Pool } from 'pg'; // A "pool" keeps several connections open and reuses them
import { getDatabaseConfig } from './database-config.mjs';

// In development Next.js reloads files often. We store the pool on globalThis
// so that each reload does not open a brand new set of connections.
const globalForPg = globalThis;

// Reuse the existing pool if we already made one, otherwise create it
export const pool =
  globalForPg.__pgPool ||
  new Pool({
    ...getDatabaseConfig(),
    max: 10,                                                                          // At most 10 connections
    idleTimeoutMillis: 30000,                                                         // Close idle connections after 30s
  });

// Remember the pool for next time (development only)
if (process.env.NODE_ENV !== 'production') {
  globalForPg.__pgPool = pool;
}

// Small helper: run a parameterised query.
// ALWAYS pass user input through "params" ($1, $2 ...) and never paste it into the SQL text.
// That is what protects the system from SQL injection.
export async function query(text, params = []) {
  return pool.query(text, params);
}
