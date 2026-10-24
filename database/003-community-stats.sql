CREATE TABLE IF NOT EXISTS community_stats (
 id integer PRIMARY KEY CHECK (id=1),
 instagram integer NOT NULL CHECK (instagram BETWEEN 0 AND 1000000000),
 tiktok integer NOT NULL CHECK (tiktok BETWEEN 0 AND 1000000000),
 whatsapp integer NOT NULL CHECK (whatsapp BETWEEN 0 AND 1000000000),
 linkedin integer NOT NULL CHECK (linkedin BETWEEN 0 AND 1000000000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO community_stats(id,instagram,tiktok,whatsapp,linkedin) VALUES(1,3900,2000,890,270) ON CONFLICT(id) DO NOTHING;
