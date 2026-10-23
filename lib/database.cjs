const { Pool } = require('pg');
let pool;
function getPool() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!pool) pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, statement_timeout: 8000 });
  return pool;
}
module.exports = { getPool };
