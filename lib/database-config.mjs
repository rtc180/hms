function removeSslParameters(connectionString) {
  const url = new URL(connectionString);
  for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
    url.searchParams.delete(parameter);
  }
  return url.toString();
}

export function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n').trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to the Supabase PostgreSQL connection string.');
  }

  if (ca) {
    return {
      connectionString: removeSslParameters(connectionString),
      ssl: { ca, rejectUnauthorized: true },
    };
  }

  return { connectionString };
}
