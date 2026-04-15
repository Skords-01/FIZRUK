import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error", err);
});

export async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS module_data (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        module TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        client_updated_at TIMESTAMPTZ DEFAULT NOW(),
        server_updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, module)
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_module_data_user ON module_data(user_id)`,
    );
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE module_data ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);
  } finally {
    client.release();
  }
}

export default pool;
