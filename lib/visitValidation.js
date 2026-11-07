// Checks visit data. Nurses may only record vitals; doctors and admins may also diagnose.
import { clean, toNumberOrNull } from './validate';

// "existing" is the current database row when editing, or null when creating
export function validateVisit(body, role, existing = null) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request' };

  // Only doctors and admins are allowed to write medical conclusions
  const canDiagnose = role === 'doctor' || role === 'admin';

  // Vital signs: each is optional but must be realistic when given
  const temperature = toNumberOrNull(body.temperature, 25, 45);
  const pulse = toNumberOrNull(body.pulse, 20, 260);
  const weight = toNumberOrNull(body.weight, 0.5, 400);
  if (temperature === undefined) return { error: 'Temperature must be between 25 and 45 °C' };
  if (pulse === undefined) return { error: 'Pulse must be between 20 and 260 bpm' };
  if (weight === undefined) return { error: 'Weight must be between 0.5 and 400 kg' };

  // Blood pressure looks like 120/80
  const blood_pressure = clean(body.blood_pressure, 10);
  if (blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(blood_pressure)) {
    return { error: 'Blood pressure must look like 120/80' };
  }

  // Complaint is required
  const complaint = clean(body.complaint, 500);
  if (!complaint) return { error: 'Enter the reason for the visit' };

  // Start from the nurse-level fields
  const data = { complaint, temperature, blood_pressure, pulse, weight };

  if (canDiagnose) {
    // Doctor fields
    data.diagnosis = clean(body.diagnosis, 255);
    data.treatment = clean(body.treatment, 4000);
    data.status = body.status === 'treated' ? 'treated' : 'waiting';

    // A visit cannot be closed without a diagnosis
    if (data.status === 'treated' && !data.diagnosis) {
      return { error: 'Add a diagnosis before marking the visit as treated' };
    }
  } else {
    // Nurses keep whatever the doctor already wrote
    data.diagnosis = existing ? existing.diagnosis : '';
    data.treatment = existing ? existing.treatment : '';
    data.status = existing ? existing.status : 'waiting';
  }

  return { data };
}
