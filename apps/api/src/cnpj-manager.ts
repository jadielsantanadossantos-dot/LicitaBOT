import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});

export async function getAllCnpjs() {
  const result = await pool.query("SELECT cnpj FROM cnpj_contas");
  return result.rows.map(row => row.cnpj);
}
