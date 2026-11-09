// Creates all database tables by running db/schema.sql
import { readFileSync } from 'node:fs';           // Read a file from disk
import { fileURLToPath } from 'node:url';         // Convert a module URL into a path
import path from 'node:path';                     // Build file paths safely
import pg from 'pg';                              // PostgreSQL client
import { getDatabaseConfig } from '../lib/database-config.mjs';

// Work out where this script lives so we can find schema.sql next to it
const here = path.dirname(fileURLToPath(import.meta.url));

// Read the SQL text
const sql = readFileSync(path.join(here, 'schema.sql'), 'utf8');

// Connect using DATABASE_URL from the environment.
const client = new pg.Client(getDatabaseConfig());

try {
  await client.connect();            // Open the connection
  await client.query(sql);           // Run the whole schema file
  console.log('Database tables are ready.');
} catch (error) {
  console.error('Could not create tables:', error.message);
  process.exitCode = 1;              // Tell the terminal that something failed
} finally {
  await client.end();                // Always close the connection
}
