-- Run once with npm run db:migrate. No public read API is provided.
CREATE TABLE IF NOT EXISTS membership_requests (
  id uuid PRIMARY KEY,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  whatsapp varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','added','declined')),
  consent_version varchar(50) NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS membership_requests_status_created_idx ON membership_requests(status, created_at DESC);
CREATE TABLE IF NOT EXISTS membership_rate_limits (
  key_hash varchar(64) PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);
