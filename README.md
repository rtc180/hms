# Good Samaritan Medical Center: Management System

Next.js (App Router) + Node.js + PostgreSQL. Works on desktops, tablets and phones.

## 1. Requirements
- Node.js 20.6 or newer
- PostgreSQL 14 or newer

## 2. Setup
```bash
npm install                       # install packages
cp .env.example .env.local        # then edit .env.local (database URL and JWT_SECRET)
createdb gsmc                     # create the database (or create it in pgAdmin)
npm run db:init                   # create the tables
npm run db:seed                   # add the 3 starter accounts and sample data
npm run dev                       # open http://localhost:3000
```

## 3. Starter accounts (change these passwords straight away)
| Role   | Email                          | Password     |
|--------|--------------------------------|--------------|
| Admin  | admin@goodsamaritan.example    | Admin@12345  |
| Doctor | doctor@goodsamaritan.example   | Doctor@12345 |
| Nurse  | nurse@goodsamaritan.example    | Nurse@12345  |

## 4. What each role can do
| Action                               | Admin | Doctor | Nurse |
|--------------------------------------|:-----:|:------:|:-----:|
| Register and edit patients           |  yes  |  yes   |  yes  |
| Record visits and vital signs        |  yes  |  yes   |  yes  |
| Admit patients and assign ward / bed  |  yes  |  yes   |  yes  |
| Manage ward beds                      |  yes  |  no    |  no   |
| Discharge inpatients                 |  yes  |  yes   |  no   |
| Enter diagnosis, treatment, close visit |  yes  |  yes   |  no   |
| Prescribe medicine                    |  yes  |  yes   |  no   |
| Manage pharmacy stock and prices       |  yes  |  no    |  no   |
| Dispense medicine / bill / take payment | yes |  no    |  yes  |
| Edit a visit after it is treated     |  yes  |  yes   |  no   |
| Search, filter and print reports     |  yes  |  yes   |  yes  |
| Delete patients                      |  yes  |  no    |  no   |
| Create / disable staff accounts      |  yes  |  no    |  no   |
| Edit company details / view audit log |  yes  |  no    |  no   |
| Pharmacy and billing                 |  yes  |  no    |  yes  |

## 5. Reports and filters
Open **Reports**. Quick reports: *All Patients*, *Treated last month*, and *Treated in the last 3 months*.
Custom filters: patient name/number/ID, diagnosis (partial match), status, gender, age range,
quick period (7 days to 1 year) or custom dates. Press **Print report** for an A4 printout with
the logo, address, phone, email, filters used, summary and the name of the person who printed it.
Patient files also have **Print patient summary**.

## Inpatient admissions
Open **Inpatient admissions** to search for a registered patient, assign an available bed from the
live ward map, and record the reason for admission. Admins configure beds; the map prevents booking
occupied beds. Current occupancy also prevents multiple active stays for the same patient. Admins
and doctors can discharge patients and record discharge notes; nurses can create admissions but
cannot discharge patients. Discharged stays remain available in the admissions history.

## Pharmacy and billing
Doctors and admins can add prescriptions to treated visits from the patient file. Admins manage the
medicine catalog, unit prices and incoming stock in **Pharmacy**; nurses dispense prescriptions from
available stock. **Billing** lets nurses and admins create a bill after treatment and dispensing,
enter a consultation fee, and record partial or full payments using the configured medicine prices.

## Company details and audit log
Admins can update the company name, address, phone, email, website and registration details from
**Settings**. Updated details appear on printed reports and patient summaries. All staff can choose
Light Mode, Dark Mode or System Default in Settings. **Audit log** shows recent staff actions and
can be searched by staff name, action, record type or IP address.

## 6. Change the organization details
Edit `config/organization.js` (name, address, phone, email, registration number).
Replace `public/logo.png` and `app/icon.png` to change the logo and browser icon.

## 7. Security built in
- Passwords hashed with bcrypt (cost 12); strong-password rule for new accounts
- Session in an httpOnly, SameSite=Strict, Secure (production) JWT cookie, 8 hour expiry
- Login rate limit (10 per 15 min per IP) and account lock after 5 wrong passwords
- Same error for wrong email or wrong password; timing-safe unknown-email check
- Role checks on every API route, re-checked against the database (disabled users lose access at once)
- Middleware protects /dashboard pages; /dashboard/users is admin only
- Every SQL query is parameterised (SQL-injection safe); LIKE wildcards escaped
- All input validated and length-limited on the server
- CSRF defence: SameSite cookie plus Origin check on every change request
- Security headers: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy
- No-store caching on /api and /dashboard so patient data is never cached
- Audit log table records logins, views, edits, deletes and reports

## 7b. Before going live
- Serve over HTTPS and set `NEXT_PUBLIC_SITE_URL` to your real address
- Use a long random `JWT_SECRET`; change the seeded passwords
- Back up the database daily; restrict database network access
- If you run more than one server, move the rate limiter in `lib/rateLimit.js` to Redis
- Check local health-data privacy law (for example Zimbabwe's Cyber and Data Protection Act)

## 8. SEO
- Public landing page with unique title, description, Open Graph tags and JSON-LD `MedicalClinic` data
- `app/robots.js` and `app/sitemap.js`; private pages are `noindex` and blocked in robots
- Semantic HTML, alt text, mobile viewport, self-hosted fonts for speed

## 9. Folder guide
```
app/                 pages and API routes
  api/               auth, patients, visits, admissions, pharmacy, billing, reports, users
  dashboard/         private pages (home, patients, admissions, pharmacy, billing, reports, settings)
components/          Sidebar, forms, report header
config/              organization details
db/                  schema.sql, init.mjs, seed.mjs
lib/                 database, auth, validation, rate limit, report query builder
middleware.js        page protection
next.config.mjs      security headers
```

After updating an existing database, run `npm run db:init` to create the ward-bed, pharmacy,
prescription and billing tables and indexes.
