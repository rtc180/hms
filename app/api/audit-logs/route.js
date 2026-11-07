// GET /api/audit-logs : paged audit history (admin only)
import { query } from '@/lib/db';
import { guard, json, fail } from '@/lib/api';
import { clean, escapeLike, toId } from '@/lib/validate';

const PAGE_SIZE = 50;

export async function GET(request) {
  const { error } = await guard(request, ['admin']);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = toId(searchParams.get('page')) || 1;
  const search = clean(searchParams.get('q'), 100);
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    where = `WHERE (
      u.full_name ILIKE $1 OR l.action ILIKE $1 OR l.entity ILIKE $1 OR l.ip_address ILIKE $1
    )`;
  }
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const { rows } = await query(
    `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.ip_address, l.created_at,
            u.full_name AS user_name, u.email AS user_email,
            COUNT(*) OVER()::int AS total
     FROM audit_logs l
     LEFT JOIN users u ON u.id = l.user_id
     ${where}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return json({
    logs: rows,
    total: rows.length ? rows[0].total : 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
