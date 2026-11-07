// GET /api/stats : numbers for the dashboard home page.
import { query } from '@/lib/db';
import { guard, json } from '@/lib/api';

export async function GET(request) {
  const { error } = await guard(request, ['admin', 'doctor', 'nurse']);
  if (error) return error;

  const [patients, today, waiting, treated, inpatients, top] = await Promise.all([
    query('SELECT COUNT(*)::int AS n FROM patients'),
    query(`SELECT COUNT(*)::int AS n FROM visits WHERE visit_date >= DATE_TRUNC('day', NOW())`),
    query(`SELECT COUNT(*)::int AS n FROM visits WHERE status = 'waiting'`),
    query(`SELECT COUNT(*)::int AS n FROM visits
           WHERE status = 'treated' AND visit_date >= NOW() - INTERVAL '3 months'`),
    query(`SELECT COUNT(*)::int AS n FROM admissions WHERE status = 'admitted'`),
    query(`SELECT diagnosis, COUNT(*)::int AS total FROM visits
           WHERE diagnosis IS NOT NULL AND diagnosis <> ''
             AND visit_date >= NOW() - INTERVAL '3 months'
           GROUP BY diagnosis ORDER BY total DESC LIMIT 6`),
  ]);

  return json({
    totalPatients: patients.rows[0].n,
    visitsToday: today.rows[0].n,
    waiting: waiting.rows[0].n,
    treatedLast3Months: treated.rows[0].n,
    inpatients: inpatients.rows[0].n,
    topDiagnoses: top.rows,
  });
}
