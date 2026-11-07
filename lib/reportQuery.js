// Builds the SQL WHERE clause for searching and reporting.
// Every filter is optional and every value goes through $1, $2 ... placeholders (SQL-injection safe).
import { clean, escapeLike, toNumberOrNull } from './validate';

// Quick time periods. Only these exact words are accepted, so no user text reaches the SQL.
const PERIODS = {
  '7d': '7 days',
  '1m': '1 month',
  '3m': '3 months',
  '6m': '6 months',
  '1y': '1 year',
};

// Pieces of SQL that the report routes share
export const REPORT_FROM = `
  FROM visits v
  JOIN patients p ON p.id = v.patient_id
  LEFT JOIN users d ON d.id = v.doctor_id
`;

// Age in whole years, calculated in the database
export const AGE_SQL = `DATE_PART('year', AGE(p.date_of_birth))::int`;

// Turn URL search parameters into { where, params }
export function buildFilters(searchParams) {
  const conditions = []; // List of SQL conditions joined with AND
  const params = [];     // Values for the $1, $2 ... placeholders

  // Adds a value to params and returns its placeholder text, e.g. "$3"
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  // --- Patient search: name, patient number or national ID ---
  const q = clean(searchParams.get('q'), 100);
  if (q) {
    const like = add(`%${escapeLike(q)}%`);
    conditions.push(
      `(p.first_name ILIKE ${like}
        OR p.last_name ILIKE ${like}
        OR (p.first_name || ' ' || p.last_name) ILIKE ${like}
        OR p.patient_no ILIKE ${like}
        OR p.national_id ILIKE ${like})`
    );
  }

  // --- Diagnosis: partial match so "malaria" finds "Malaria (severe)" ---
  const diagnosis = clean(searchParams.get('diagnosis'), 100);
  if (diagnosis) {
    conditions.push(`v.diagnosis ILIKE ${add(`%${escapeLike(diagnosis)}%`)}`);
  }

  // --- Visit status: waiting or treated ---
  const status = clean(searchParams.get('status'), 10);
  if (['waiting', 'treated'].includes(status)) {
    conditions.push(`v.status = ${add(status)}`);
  }

  // --- Gender ---
  const gender = clean(searchParams.get('gender'), 10);
  if (['Male', 'Female', 'Other'].includes(gender)) {
    conditions.push(`p.gender = ${add(gender)}`);
  }

  // --- Age range ---
  const ageMin = toNumberOrNull(searchParams.get('ageMin'), 0, 130);
  const ageMax = toNumberOrNull(searchParams.get('ageMax'), 0, 130);
  if (typeof ageMin === 'number') conditions.push(`${AGE_SQL} >= ${add(ageMin)}`);
  if (typeof ageMax === 'number') conditions.push(`${AGE_SQL} <= ${add(ageMax)}`);

  // --- Time period: quick preset OR custom from/to dates ---
  const period = clean(searchParams.get('period'), 5);
  const from = clean(searchParams.get('from'), 10);
  const to = clean(searchParams.get('to'), 10);

  if (PERIODS[period]) {
    // The interval text comes from our own list above, never from the user
    conditions.push(`v.visit_date >= NOW() - INTERVAL '${PERIODS[period]}'`);
  } else {
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      conditions.push(`v.visit_date >= ${add(from)}::date`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      // Add one day so the "to" date itself is included
      conditions.push(`v.visit_date < (${add(to)}::date + INTERVAL '1 day')`);
    }
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}
