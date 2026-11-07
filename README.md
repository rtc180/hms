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


After updating an existing database, run `npm run db:init` to create the ward-bed, pharmacy,
prescription and billing tables and indexes.
