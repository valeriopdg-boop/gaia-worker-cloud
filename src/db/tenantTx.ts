import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool);
export type Tx = typeof db;

// TODO: implementa withSessionTx come nello scheletro che ti ho dato
