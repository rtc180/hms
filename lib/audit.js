// Writes a line to the audit log: who did what, to which record, from where.
import { query } from './db';

export async function writeAudit(userId, action, entity, entityId, details, ip) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip]
    );
  } catch (error) {
    // A failed audit write must never break the user's request, but we do want to know about it
    console.error('Audit log failed:', error.message);
  }
}
