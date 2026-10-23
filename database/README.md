# Membership requests — PostgreSQL

The site uses standard PostgreSQL through a Node.js server. Vercel is optional.
No admin page or public endpoint for listing applicants is implemented.

## Local setup (Windows)

PostgreSQL 18 is installed and running on the development machine.
Connect from PowerShell; psql prompts for the password without printing it:

```powershell
psql -h localhost -U postgres -d postgres
```

Create a separate database (only if it does not already exist):

```sql
CREATE DATABASE girls_in_luxembourg;
\q
```

Copy `.env.example` to `.env` and set DATABASE_URL locally. Never commit this file.
Use the PostgreSQL username/password you configured when installing PostgreSQL.
URL-encode special characters in the password. Do not disable database authentication.

```powershell
Copy-Item .env.example .env
# Edit .env locally, then:
npm.cmd install
npm.cmd run db:migrate
npm.cmd run dev
```

Requires Node.js 22 or later. Open http://localhost:5173/join.html.
`server.cjs` loads `.env` locally. The migration creates two tables without deleting data.
Test with your own details, then verify locally:

```sql
SELECT first_name, last_name, email, whatsapp, status, created_at
FROM membership_requests ORDER BY created_at DESC;
```

## Online hosting

Serve static files from `dist/`, and POST `/api/membership` using Node.js with the
same DATABASE_URL environment variable. With Vercel, `api/membership.js` is the
serverless entry point. A separately hosted PostgreSQL instance must be reachable
from that server (localhost on Vercel does not refer to your computer).
Require TLS for remote PostgreSQL using your provider's connection settings.
Run the migration against the intended database before enabling submissions.
Use a dedicated, least-privileged database account in production, backups, and HTTPS.
An optional RATE_LIMIT_SECRET can provide a dedicated random HMAC key.

Without a configured database or migrated tables, the API returns 503; it never
pretends a request has been stored. The browser keeps entered information for retry.
No details are written to browser storage, application logs or static assets.

## Stored fields

UUID, first name, last name, normalized email, international WhatsApp number,
status (pending/contacted/added/declined), consent version/time, created/updated time.
Email is unique; resubmission does not overwrite existing requests or reveal whether
someone is registered. Responses contain no personal data. Rate limits allow five
valid submission attempts per 15 minutes per hashed IP. Expired hash records are
removed on subsequent requests (after one day); original IPs are not stored.

The future administrator area must authenticate and authorize administrators before
reading, updating or deleting applicants. Define a retention policy with the team
before collecting real memberships. No automatic WhatsApp integration is included:
the team contacts applicants and adds them manually.

## Verification

`node --test scripts/membership.test.cjs` checks validation and API error paths.
The browser check mocks API responses to test the UI without submitting real data.
Real persistence requires the configured database and the migration above.
