CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash varchar(64) PRIMARY KEY,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_login_limits (
 key_hash varchar(64) PRIMARY KEY,
 window_start timestamptz NOT NULL,
 attempts integer NOT NULL
);
