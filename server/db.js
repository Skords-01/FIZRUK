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
        client_updated_at TIMESTAMPTZ DEFAULT NOW(),
        server_updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, module)
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_module_data_user ON module_data(user_id)`,
    );
  } finally {
    client.release();
  }
}

export default pool;
