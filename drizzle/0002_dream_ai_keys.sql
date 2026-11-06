CREATE TABLE IF NOT EXISTS aivow_ai_keys (user_id text PRIMARY KEY NOT NULL, ciphertext text NOT NULL, iv text NOT NULL, hint text NOT NULL, version integer NOT NULL DEFAULT 1);
