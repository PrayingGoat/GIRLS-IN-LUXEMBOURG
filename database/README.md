# Membership requests — PostgreSQL

The site uses standard PostgreSQL through a Node.js server. Vercel is optional.
The private administrator page is available at /admin. No public listing endpoint is provided.

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

The administrator area authenticates every request before reading or updating
applicants. Define a retention policy with the team before collecting real memberships. No automatic WhatsApp integration is included:
the team contacts applicants and adds them manually.

## Verification

`node --test scripts/membership.test.cjs` checks validation and API error paths.
The browser check mocks API responses to test the UI without submitting real data.
Real persistence requires the configured database and the migration above.

## Administrator area

Visit `/admin` directly. There is no link to it on public pages.
The login screen contains no member data; all administrative data requests check a
server-side session. The area is not a general CMS: it manages membership requests.

1. Configure PostgreSQL as above, then run `npm run db:migrate` (includes admin tables).
2. Run `npm run admin:setup` in your terminal. Choose a password of at least 14 characters.
   The terminal hides input and stores only a salted scrypt hash in the ignored `.env`.
3. Restart the Node server, then open http://localhost:5173/admin.
4. On another host, configure ADMIN_PASSWORD_HASH and DATABASE_URL as server environment
   variables. Never include these in HTML, browser JavaScript or a public repository.

Sessions last eight hours, use a random token in an HttpOnly, SameSite=Strict cookie,
and are stored as hashes in PostgreSQL. HTTPS deployments set Secure. Logout removes
the session from the database. Revoke all sessions after changing the password with
`DELETE FROM admin_sessions;`. Always use HTTPS for online administration.
For a reverse proxy, pass the correct Host, Origin and X-Forwarded-Proto headers.

The dashboard supports search, pagination, all applicant details, counts and status
changes. It does not send WhatsApp messages or add people automatically. No public
listing, export, deletion or registration endpoint for administrators is provided.
Use distinct admin accounts and audit logging if several administrators need access
in a future iteration; the current version uses one shared administrator password.

## Homepage community numbers

Migration `003-community-stats.sql` adds the four homepage counters, initialized to
3900 / 2000 / 890 / 270. Re-running migrations preserves saved values.
After `npm run db:migrate`, sign in at `/admin` and use **Community numbers**.
Values must be whole numbers from 0 to 1,000,000,000; the site retains the + suffix.
Saving updates all four values atomically. They are loaded on the next homepage
visit through the read-only `/api/community-stats` endpoint. The existing numbers
are a fallback when the database is unavailable. This is manual editing by an
administrator, not synchronization with social networks.
