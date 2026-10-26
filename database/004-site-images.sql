CREATE TABLE IF NOT EXISTS site_images (
 slot_id text PRIMARY KEY,
 image_data bytea,
 asset_path text,
 alt_text text NOT NULL DEFAULT '',
 position_x integer NOT NULL DEFAULT 50 CHECK(position_x BETWEEN 0 AND 100),
 position_y integer NOT NULL DEFAULT 50 CHECK(position_y BETWEEN 0 AND 100),
 version text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((image_data IS NOT NULL AND asset_path IS NULL) OR (image_data IS NULL AND asset_path IS NOT NULL)),
 CHECK (image_data IS NULL OR octet_length(image_data) <= 2097152)
);
