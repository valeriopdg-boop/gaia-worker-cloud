import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool, { schema });
export type Tx = typeof db;

export async function withSessionTx<T>(
  _ctx: { userId: string; tenantId: string | null },
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  // versione semplice: nessun RLS, solo una tx logica
  return fn(db);
}

export { schema };
