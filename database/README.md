# MongoDB Atlas storage

The application uses MongoDB Atlas for administrator sessions, community numbers,
image overrides, and any historical membership requests. PostgreSQL is no longer
used at runtime. Joining the community goes directly to WhatsApp.

## Configuration
Use Node.js 22 or later. Set MONGODB_URI and MONGODB_DB in the ignored .env.
The database name is girls_in_luxembourg. Allow the application's outbound
connections in Atlas Network Access. Use TLS and never commit credentials.

Run:
- npm install
- npm run db:migrate
- npm run admin:setup (only to create/change the admin password)
- npm run dev

The initializer is idempotent and does not overwrite saved community counts.
It creates six collections:
- community_stats: one document, id=1, with the four public counters
- site_images: unique slot_id; built-in path OR uploaded WebP bytes
- admin_sessions: unique hashed token, expiry, and TTL cleanup
- admin_login_limits: hashed IP key, atomic 15-minute attempt window, 24-hour TTL
- membership_requests: historical records, unique UUID and email
- membership_rate_limits: legacy endpoint limiter with 24-hour TTL

Uploads are validated and re-encoded by sharp, at most 2000px / 2 MiB each.
They are stored as BSON binary data, not in the ephemeral application filesystem.
Do not make Atlas collections publicly accessible. The browser only calls our APIs.

## Vercel
Set these server-side environment variables in the project:
- MONGODB_URI
- MONGODB_DB
- ADMIN_PASSWORD_HASH (the scrypt hash generated locally, not a plaintext password)
- RATE_LIMIT_SECRET (optional)

Configure the variables for each intended environment (Production/Preview),
then redeploy. The same Atlas database means admin edits are shared immediately
between environments after a public page reload. Use a different database name
for isolated previews; initialize that database before using it.

Never include these variables in HTML or use a public/browser variable prefix.
Local .env files are deliberately not uploaded via Git.
Atlas Network Access must permit connections from Vercel's outbound environment.
A database-user password cannot administer Atlas network access settings.

Verify /api/community-stats returns source "database", /api/site-images returns
an images array, and /admin allows login, count saves, image saves and logout.
A public count fallback is not evidence of a working database.

## Migration from PostgreSQL
The one-time importer uses pg as a development-only dependency. Supply
POSTGRES_MIGRATION_URL plus the MongoDB settings and run npm run db:import:postgres.
It reads all six old tables in a consistent read-only snapshot, saves an Extended
JSON backup under ignored .research/database-backups/, inserts records without
overwriting existing Atlas documents, then compares every copied field.
Rerunning with conflicting records fails verification rather than overwriting
newer Atlas edits. Keep the original PostgreSQL database and backup until the
deployment has been verified. SQL files in this directory are historical only.

## Authentication
/admin is not linked in public navigation. Every protected API checks its session.
Sessions last 8 hours, store only a token hash, and use HttpOnly / SameSite=Strict
cookies (Secure on HTTPS). Expiry is checked on every request independently of
asynchronous TTL cleanup. Logout deletes the session. Revoke all sessions in Atlas
after changing an admin password:
db.admin_sessions.deleteMany({})

## Verification
node --test scripts/admin.test.cjs scripts/community-stats.test.cjs scripts/membership.test.cjs
npm run build

The live image check uses TEST_BASE_URL:
node --env-file=.env scripts/check-media.cjs
It temporarily edits the first hero photo and restores it in finally. Run outside
active admin editing, preferably with a dedicated test database.

## Original image library in Atlas
All raster/SVG images in assets/ and photos/ are copied byte-for-byte into
media_assets (unique path, MIME type, SHA-256 checksum and BSON binary bytes).
Run npm run db:import:media after adding original image files. The importer
never overwrites existing images silently; it verifies their checksums.
Original photos are archived privately; only assets/ image paths are public.

The build excludes image files from dist/assets. Vercel rewrites their existing
URLs to /api/media, and the local server uses the same endpoint. Browser/CDN
caching and ETags avoid unnecessary repeated database downloads. Logos, flags,
favicons, thumbnails and responsive image variants also come from Atlas.
Local image files remain backups; the running website does not fall back to them.
Admin uploads continue using site_images, and restoring the original returns to
the Atlas-backed media_assets image. Fonts, HTML, CSS and JS remain application code.
