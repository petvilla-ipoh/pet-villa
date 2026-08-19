import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await pool.query<T>(text, values);
  return result;
}

export async function one<T extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await query<T>(text, values);
  return result.rows[0] ?? null;
}

export async function withTransaction<T>(work: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
