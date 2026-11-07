// GET /api/pharmacy : medicines and pending prescriptions (admin/nurse)
import { pool } from '@/lib/db';
import { guard, json } from '@/lib/api';

export async function GET(request) {
  const { error } = await guard(request, ['admin', 'nurse']);
  if (error) return error;

  const [medicines, prescriptions] = await Promise.all([
    pool.query(
      `SELECT id, name, strength, dosage_form, stock_quantity, unit_price, is_active
       FROM medicines ORDER BY is_active DESC, LOWER(name), LOWER(strength)`
    ),
    pool.query(
      `SELECT pr.id, pr.visit_id, pr.quantity, pr.dosage_instructions, pr.prescribed_at,
              m.name AS medicine_name, m.strength, m.dosage_form, m.stock_quantity,
              p.patient_no, p.first_name, p.last_name, v.diagnosis,
              doctor.full_name AS prescribed_by_name
       FROM prescriptions pr
       JOIN medicines m ON m.id = pr.medicine_id
       JOIN visits v ON v.id = pr.visit_id
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN users doctor ON doctor.id = pr.prescribed_by
       WHERE pr.status = 'pending'
       ORDER BY pr.prescribed_at, pr.id`
    ),
  ]);
  return json({ medicines: medicines.rows, prescriptions: prescriptions.rows });
}
