// Adds the three starter accounts and a little sample data so you can try the system.
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { getDatabaseConfig } from '../lib/database-config.mjs';

const client = new pg.Client(getDatabaseConfig());

// Starter accounts. CHANGE THESE PASSWORDS after your first login.
const starterUsers = [
  { name: 'System Administrator', email: 'admin@goodsamaritan.example',  role: 'admin',  password: 'Admin@12345' },
  { name: 'Dr. Tendai Moyo',      email: 'doctor@goodsamaritan.example', role: 'doctor', password: 'Doctor@12345' },
  { name: 'Nurse Rudo Chikwanha', email: 'nurse@goodsamaritan.example',  role: 'nurse',  password: 'Nurse@12345' },
];

// Sample patients: [first, last, gender, date of birth, phone]
const samplePatients = [
  ['Farai',    'Ncube',    'Male',   '1988-03-14', '+263 77 100 0001'],
  ['Chipo',    'Dube',     'Female', '1995-07-22', '+263 77 100 0002'],
  ['Tatenda',  'Sibanda',  'Male',   '2012-11-02', '+263 77 100 0003'],
  ['Nyasha',   'Mutasa',   'Female', '1979-01-30', '+263 77 100 0004'],
  ['Blessing', 'Chuma',    'Male',   '2001-09-09', '+263 77 100 0005'],
  ['Ruvimbo',  'Gumbo',    'Female', '1966-05-18', '+263 77 100 0006'],
  ['Kudzai',   'Marufu',   'Male',   '2019-02-11', '+263 77 100 0007'],
  ['Tsitsi',   'Mapfumo',  'Female', '1992-12-25', '+263 77 100 0008'],
];

// Sample visits: [patient index, days ago, complaint, diagnosis, treatment, status]
const sampleVisits = [
  [0, 5,   'Fever, chills and headache',    'Malaria',               'Artemether-Lumefantrine, 3 day course',  'treated'],
  [1, 20,  'Cough and sore throat',         'Upper respiratory infection', 'Rest, fluids, paracetamol',      'treated'],
  [2, 35,  'High fever and vomiting',       'Malaria',               'Artesunate injection then oral course',  'treated'],
  [3, 60,  'Headache and dizziness',        'Hypertension',          'Amlodipine 5mg daily, review in 2 weeks', 'treated'],
  [4, 80,  'Fever and body pain',           'Malaria',               'Artemether-Lumefantrine, 3 day course',  'treated'],
  [5, 120, 'Frequent urination and thirst', 'Type 2 diabetes',       'Metformin 500mg twice daily',            'treated'],
  [6, 2,   'Diarrhoea for two days',        'Gastroenteritis',       'Oral rehydration salts, zinc',           'treated'],
  [7, 0,   'Abdominal pain',                null,                    null,                                     'waiting'],
  [0, 200, 'Back pain',                     'Muscle strain',         'Ibuprofen and rest',                     'treated'],
];

try {
  await client.connect();

  // 1. Create the three accounts (skip any that already exist)
  for (const u of starterUsers) {
    const hash = await bcrypt.hash(u.password, 12);       // Hash the password, 12 = strength
    await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role]
    );
  }

  // 2. Add sample patients only if the table is empty
  const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM patients');
  if (rows[0].total === 0) {
    const patientIds = [];
    for (const p of samplePatients) {
      const result = await client.query(
        `INSERT INTO patients (first_name, last_name, gender, date_of_birth, phone)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        p
      );
      patientIds.push(result.rows[0].id);
    }

    // Find the doctor and nurse ids to attach to the visits
    const doctor = (await client.query(`SELECT id FROM users WHERE role = 'doctor' LIMIT 1`)).rows[0];
    const nurse  = (await client.query(`SELECT id FROM users WHERE role = 'nurse' LIMIT 1`)).rows[0];

    for (const [index, daysAgo, complaint, diagnosis, treatment, status] of sampleVisits) {
      await client.query(
        `INSERT INTO visits
           (patient_id, visit_date, complaint, diagnosis, treatment, status, recorded_by, doctor_id)
         VALUES ($1, NOW() - make_interval(days => $2), $3, $4, $5, $6, $7, $8)`,
        [patientIds[index], daysAgo, complaint, diagnosis, treatment, status, nurse.id,
         status === 'treated' ? doctor.id : null]
      );
    }
  }

  console.log('Starter data added. Sign in with:');
  for (const u of starterUsers) console.log(`  ${u.role.padEnd(7)} ${u.email}  /  ${u.password}`);
  console.log('Change these passwords after your first login.');
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
