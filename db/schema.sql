-- =====================================================================
-- Good Samaritan Medical Center : database schema
-- Safe to run more than once (every statement uses IF NOT EXISTS).
-- =====================================================================

-- A counter used to build patient numbers such as GSMC-000001
CREATE SEQUENCE IF NOT EXISTS patient_no_seq START 1;

-- ---------------------------------------------------------------------
-- USERS : staff who can log in (admin, doctor, nurse)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,                                   -- Unique id
  full_name       VARCHAR(120) NOT NULL,                                -- Display name
  email           VARCHAR(255) NOT NULL UNIQUE,                         -- Login name (stored in lower case)
  password_hash   VARCHAR(100) NOT NULL,                                -- bcrypt hash, never the real password
  role            VARCHAR(10)  NOT NULL
                  CHECK (role IN ('admin', 'doctor', 'nurse')),         -- The only three allowed roles
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,                   -- FALSE = account disabled
  failed_attempts INTEGER      NOT NULL DEFAULT 0,                      -- Wrong password counter
  locked_until    TIMESTAMPTZ,                                          -- Temporary lock after too many failures
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()                   -- When the account was created
);

-- ---------------------------------------------------------------------
-- PATIENTS : one row per registered patient
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id                SERIAL PRIMARY KEY,
  patient_no        VARCHAR(20) NOT NULL UNIQUE
                    DEFAULT ('GSMC-' || LPAD(NEXTVAL('patient_no_seq')::TEXT, 6, '0')), -- Auto number
  first_name        VARCHAR(80)  NOT NULL,
  last_name         VARCHAR(80)  NOT NULL,
  gender            VARCHAR(10)  NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth     DATE         NOT NULL,
  national_id       VARCHAR(40),
  phone             VARCHAR(30),
  address           VARCHAR(255),
  blood_group       VARCHAR(5),
  allergies         VARCHAR(255),
  next_of_kin_name  VARCHAR(120),
  next_of_kin_phone VARCHAR(30),
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,    -- Who registered the patient
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- VISITS : each time a patient is seen (nurse adds vitals, doctor adds diagnosis)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
  id             SERIAL PRIMARY KEY,
  patient_id     INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE, -- Deleting a patient removes visits
  visit_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  complaint      VARCHAR(500) NOT NULL,                  -- Reason for the visit
  temperature    NUMERIC(4,1),                           -- Degrees Celsius
  blood_pressure VARCHAR(10),                            -- For example 120/80
  pulse          INTEGER,                                -- Beats per minute
  weight         NUMERIC(5,1),                           -- Kilograms
  diagnosis      VARCHAR(255),                           -- Filled in by the doctor
  treatment      TEXT,                                   -- Treatment / prescription notes
  status         VARCHAR(10) NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting', 'treated')),
  recorded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Nurse or staff who opened the visit
  doctor_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Doctor who treated the patient
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- BEDS : managed ward/bed inventory used by the inpatient bed map
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beds (
  id          SERIAL PRIMARY KEY,
  ward        VARCHAR(80) NOT NULL,
  bed_number  VARCHAR(20) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_ward_number
  ON beds (LOWER(ward), LOWER(bed_number));

-- ---------------------------------------------------------------------
-- ADMISSIONS : inpatient stays and current ward/bed occupancy
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admissions (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  bed_id          INTEGER REFERENCES beds(id) ON DELETE SET NULL,
  ward            VARCHAR(80) NOT NULL,
  bed_number      VARCHAR(20) NOT NULL,
  reason          VARCHAR(500) NOT NULL,
  diagnosis       VARCHAR(255),
  status          VARCHAR(12) NOT NULL DEFAULT 'admitted'
                  CHECK (status IN ('admitted', 'discharged')),
  admitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharged_at  TIMESTAMPTZ,
  discharge_notes TEXT,
  admitted_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discharged_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'admitted' AND discharged_at IS NULL) OR
    (status = 'discharged' AND discharged_at IS NOT NULL)
  )
);

ALTER TABLE admissions ADD COLUMN IF NOT EXISTS bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL;

INSERT INTO beds (ward, bed_number)
SELECT DISTINCT ward, bed_number FROM admissions
ON CONFLICT DO NOTHING;

UPDATE admissions a SET bed_id = b.id
FROM beds b
WHERE a.bed_id IS NULL
  AND LOWER(a.ward) = LOWER(b.ward)
  AND LOWER(a.bed_number) = LOWER(b.bed_number);

-- ---------------------------------------------------------------------
-- PHARMACY : medicine catalog, prescription orders and dispensing
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicines (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(160) NOT NULL,
  strength      VARCHAR(80) NOT NULL DEFAULT '',
  dosage_form   VARCHAR(60) NOT NULL DEFAULT '',
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicines_unique_product
  ON medicines (LOWER(name), LOWER(strength), LOWER(dosage_form));

CREATE TABLE IF NOT EXISTS prescriptions (
  id                   SERIAL PRIMARY KEY,
  visit_id             INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  medicine_id          INTEGER NOT NULL REFERENCES medicines(id),
  dosage_instructions  VARCHAR(500) NOT NULL,
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  status               VARCHAR(12) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'dispensed')),
  prescribed_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  prescribed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispensed_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  dispensed_at         TIMESTAMPTZ,
  unit_price_at_dispense NUMERIC(12,2) CHECK (unit_price_at_dispense >= 0),
  CHECK (
    (status = 'pending' AND dispensed_at IS NULL) OR
    (status = 'dispensed' AND dispensed_at IS NOT NULL AND unit_price_at_dispense IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS bills (
  id                 SERIAL PRIMARY KEY,
  visit_id           INTEGER NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  consultation_fee   NUMERIC(12,2) NOT NULL CHECK (consultation_fee >= 0),
  medication_total   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (medication_total >= 0),
  total_amount       NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  amount_paid        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= total_amount),
  status             VARCHAR(10) NOT NULL DEFAULT 'unpaid'
                     CHECK (status IN ('unpaid', 'partial', 'paid')),
  billed_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id            SERIAL PRIMARY KEY,
  bill_id       INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'insurance', 'other')),
  received_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- AUDIT_LOGS : who did what and when (important for medical records)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,        -- e.g. LOGIN, CREATE, UPDATE, DELETE
  entity     VARCHAR(50),                 -- e.g. patient, visit, user
  entity_id  INTEGER,
  details    JSONB,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ORGANIZATION_SETTINGS : editable company details used on reports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_settings (
  id           SMALLINT PRIMARY KEY CHECK (id = 1),
  name         VARCHAR(160) NOT NULL,
  short_name   VARCHAR(40) NOT NULL,
  tagline      VARCHAR(200) NOT NULL,
  address      VARCHAR(255) NOT NULL,
  phone        VARCHAR(40) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  website      VARCHAR(255) NOT NULL DEFAULT '',
  registration VARCHAR(100) NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO organization_settings
  (id, name, short_name, tagline, address, phone, email, website, registration)
VALUES
  (1, 'Good Samaritan Medical Center', 'GSMC', 'Compassionate care for every patient',
   '123 Samaritan Road, Harare, Zimbabwe', '+263 242 000 000',
   'info@goodsamaritan.example', 'www.goodsamaritan.example', 'Reg. No. MC-0000')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- INDEXES : make filtering and reports fast
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_visits_patient    ON visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date       ON visits (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status     ON visits (status);
CREATE INDEX IF NOT EXISTS idx_visits_diagnosis  ON visits (LOWER(diagnosis));
CREATE INDEX IF NOT EXISTS idx_patients_name     ON patients (LOWER(last_name), LOWER(first_name));
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions (patient_id, admitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions (status, admitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_admissions_bed ON admissions (bed_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_active_patient
  ON admissions (patient_id) WHERE status = 'admitted';
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_active_bed
  ON admissions (LOWER(ward), LOWER(bed_number)) WHERE status = 'admitted';
CREATE INDEX IF NOT EXISTS idx_audit_created     ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON prescriptions (visit_id, prescribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions (status, prescribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON bill_payments (bill_id, created_at DESC);
