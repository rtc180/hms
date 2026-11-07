// Checks and cleans patient data coming from the browser.
import { clean, isDateString } from './validate';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Returns { error } or { data }
export function validatePatient(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request' };

  // Clean every field
  const data = {
    first_name: clean(body.first_name, 80),
    last_name: clean(body.last_name, 80),
    gender: clean(body.gender, 10),
    date_of_birth: clean(body.date_of_birth, 10),
    national_id: clean(body.national_id, 40),
    phone: clean(body.phone, 30),
    address: clean(body.address, 255),
    blood_group: clean(body.blood_group, 5),
    allergies: clean(body.allergies, 255),
    next_of_kin_name: clean(body.next_of_kin_name, 120),
    next_of_kin_phone: clean(body.next_of_kin_phone, 30),
  };

  // Required fields
  if (!data.first_name) return { error: 'First name is required' };
  if (!data.last_name) return { error: 'Last name is required' };
  if (!GENDERS.includes(data.gender)) return { error: 'Choose a gender' };
  if (!isDateString(data.date_of_birth)) return { error: 'Enter a valid date of birth' };

  // Date of birth cannot be in the future
  if (new Date(data.date_of_birth) > new Date()) return { error: 'Date of birth cannot be in the future' };

  // Blood group must be one of the known values
  if (!BLOOD_GROUPS.includes(data.blood_group)) return { error: 'Choose a valid blood group' };

  // Phone numbers: digits, spaces, plus, dash and brackets only
  const phonePattern = /^[0-9+\-()\s]*$/;
  if (!phonePattern.test(data.phone)) return { error: 'Phone number contains invalid characters' };
  if (!phonePattern.test(data.next_of_kin_phone)) return { error: 'Next of kin phone contains invalid characters' };

  return { data };
}
