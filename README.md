# Good Samaritan Medical Center HMS

Next.js hospital management system using PostgreSQL. The application connects directly to Supabase Postgres with the `pg` driver; it does not need Supabase Auth or the Supabase JavaScript client.

## Deploy to Supabase and Vercel

### 1. Create the Supabase database

1. Create a Supabase project and keep its database password private.
2. In the Supabase dashboard, open **Connect** and select the **Transaction pooler** connection string (port `6543`) for serverless hosting.
3. Keep the supplied `sslmode=require` parameter in the connection string. The PostgreSQL driver verifies TLS certificates by default. If your Supabase project provides a CA certificate and your connection requires it, set `DATABASE_CA_CERT` to its PEM contents; certificate verification remains enabled.
4. This application uses its own authenticated API and does not call Supabase's Data API. Disable the Data API for the project if it is not otherwise needed. If you keep it enabled, configure row-level security and permissions before storing patient data.

### 2. Initialize the schema and create the first administrator

Use Node.js 20.6 or newer. Copy `.env.example` to `.env.local`, then fill in the Supabase Transaction pooler URL and a unique `JWT_SECRET` of at least 32 characters. For example, generate a secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Add temporary `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` values to the ignored `.env.local` file. The password must be 8–100 characters and contain uppercase, lowercase, and a number.

Run the schema once, then create the administrator:

```powershell
npm ci
npm run db:init
npm run db:create-admin
```

Remove the temporary `ADMIN_*` values from `.env.local` after account creation. The admin script will not overwrite an existing account. Do not run `npm run db:seed` against production; it is for local demo data only and refuses to run when `NODE_ENV=production`.

### 3. Deploy the application on Vercel

1. Push the project to a Git provider and import it into Vercel. Vercel detects Next.js automatically; no custom deployment configuration is required.
2. Add these environment variables to the Vercel project:
   - `DATABASE_URL`: Supabase Transaction pooler URL (keep `sslmode=require`).
   - `JWT_SECRET`: the same strong, private signing secret used for this deployment.
   - `NEXT_PUBLIC_SITE_URL`: the public HTTPS URL of the production site, such as your custom domain. Set it for Production; leave it unset for Preview deployments to use Vercel's preview URL.
   - `DATABASE_CA_CERT`: optional PEM certificate, only if required by the database connection.
3. Set secrets only in Vercel's environment-variable settings, not in source files or `NEXT_PUBLIC_*` variables.
4. Redeploy after setting or changing environment variables. Vercel runs `npm run build`; database schema setup is a separate one-time step and should not be part of each build.

The Postgres pool is limited to one connection per serverless instance to reduce connection pressure on Supabase's pooler. Create additional staff accounts after logging in through **Users**.

## Local development

Copy `.env.example` to `.env.local`, provide a database URL and JWT secret, then run:

```powershell
npm ci
npm run db:init
npm run dev
```

`npm run db:seed` adds demo staff, patients, and visits for local testing only.
