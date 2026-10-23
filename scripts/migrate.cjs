const { getPool } = require('../lib/database.cjs');
const fs = require('node:fs');
(async () => { const pool = getPool(); try { await pool.query(fs.readFileSync(require('node:path').join(__dirname, '../database/001-membership.sql'), 'utf8')); console.log('Membership tables ready.'); } finally { await pool.end(); } })().catch(() => { console.error('Migration failed. Check the database connection and permissions.'); process.exit(1); });
