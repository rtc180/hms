// GET /api/reports : filtered visit report plus a summary.
// Example: /api/reports?diagnosis=malaria&period=3m&status=treated
import { query } from '@/lib/db';
import { guard, json, getIp } from '@/lib/api';
import { buildFilters, REPORT_FROM, AGE_SQL } from '@/lib/reportQuery';
import { writeAudit } from '@/lib/audit';

const MAX_ROWS = 1000; // Safety limit so one report cannot overload the server

export async function GET(request) {
  const { user, error } = await guard(request, ['admin', 'doctor', 'nurse']);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { where, params } = buildFilters(searchParams);   // Filters -> SQL

  // Run the three queries at the same time
  const [rowsResult, totalsResult, diagnosisResult] = await Promise.all([
    // 1. The detailed rows
    query(
      `SELECT v.id, v.visit_date, v.complaint, v.diagnosis, v.treatment, v.status,
              p.id AS patient_id, p.patient_no, p.first_name, p.last_name, p.gender,
              p.date_of_birth, p.phone, ${AGE_SQL} AS age, d.full_name AS doctor_name
       ${REPORT_FROM}
       ${where}
       ORDER BY v.visit_date DESC
       LIMIT ${MAX_ROWS}`,
      params
    ),
    // 2. Totals
    query(
      `SELECT COUNT(*)::int AS total_visits,
              COUNT(DISTINCT v.patient_id)::int AS total_patients
       ${REPORT_FROM} ${where}`,
      params
    ),
    // 3. Most common diagnoses in the filtered set
    query(
      `SELECT COALESCE(NULLIF(TRIM(v.diagnosis), ''), 'Not yet diagnosed') AS diagnosis,
              COUNT(*)::int AS total
       ${REPORT_FROM} ${where}
       GROUP BY 1 ORDER BY total DESC LIMIT 10`,
      params
    ),
  ]);

  await writeAudit(user.id, 'REPORT', 'report', null, Object.fromEntries(searchParams), getIp(request));

  return json({
    rows: rowsResult.rows,
    summary: {
      totalVisits: totalsResult.rows[0].total_visits,
      totalPatients: totalsResult.rows[0].total_patients,
      byDiagnosis: diagnosisResult.rows,
      truncated: totalsResult.rows[0].total_visits > MAX_ROWS,
    },
  });
}
