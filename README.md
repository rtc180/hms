# Hospital Management System

## Database TLS

For hosted PostgreSQL databases that use a private CA, set `DATABASE_CA_CERT` in the deployment environment to the provider's CA certificate PEM, including its `BEGIN CERTIFICATE` and `END CERTIFICATE` lines. The application uses that certificate to verify the database server. Newline-escaped PEM values (`\n`) are also supported.

When `DATABASE_CA_CERT` is set, SSL parameters in `DATABASE_URL` are removed so they cannot override the verified TLS configuration. If no CA is available, `DATABASE_SSL=true` enables encrypted connections without verifying the server identity; use this only as a temporary compatibility option. With neither setting, the PostgreSQL driver's URL/default SSL behavior applies.
