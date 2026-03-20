CREATE TABLE IF NOT EXISTS passkey (
  id TEXT PRIMARY KEY,
  name TEXT,
  "publicKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "credentialID" TEXT NOT NULL,
  counter BIGINT NOT NULL,
  "deviceType" TEXT NOT NULL,
  "backedUp" BOOLEAN NOT NULL,
  transports TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aaguid TEXT
);

CREATE INDEX IF NOT EXISTS passkey_user_id_idx ON passkey ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS passkey_credential_id_unique ON passkey ("credentialID");
