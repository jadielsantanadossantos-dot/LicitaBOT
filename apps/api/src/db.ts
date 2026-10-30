import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
for (const p of [path.resolve(".env"), path.resolve("../../.env"), path.resolve(process.cwd(), ".env"), path.resolve("apps/api/.env")]) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}
import { Pool } from "pg";
const cs = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
if (!cs) throw new Error("DATABASE_URL obrigatoria - configure .env (ex: postgresql://postgres:licita@127.0.0.1:5432/licitabot)");
export const pool = new Pool({
  connectionString: cs,
  ssl: cs.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
pool.on("error", (e) => console.error("[db] pool", e.message));
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const r: any = await pool.query(text, params);
  return { rows: r.rows as T[], rowCount: r.rowCount ?? 0 };
}

export async function setupDb() {
  await query(`ALTER TABLE disputas ADD COLUMN IF NOT EXISTS exequibilidade NUMERIC(5,2) NOT NULL DEFAULT 50`).catch(()=>{});
  await query(`ALTER TABLE disputas ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT false`).catch(()=>{});
  await query(`ALTER TABLE itens ADD COLUMN IF NOT EXISTS posicao_alvo INTEGER NOT NULL DEFAULT 1`).catch(()=>{});
  await query(`ALTER TABLE itens ALTER COLUMN piso DROP NOT NULL`).catch(()=>{});
  await query(`
    CREATE TABLE IF NOT EXISTS edital_favoritos (
      id TEXT PRIMARY KEY,
      numero TEXT,
      objeto TEXT,
      orgao TEXT,
      uf TEXT,
      municipio TEXT,
      data_abertura TEXT,
      modo TEXT,
      url TEXT,
      edital_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).catch(()=>{});
  await query(`
    CREATE TABLE IF NOT EXISTS lance_logs (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ DEFAULT now(),
      licitacao_id TEXT,
      item_id TEXT,
      valor NUMERIC,
      cnpj TEXT,
      ok BOOLEAN,
      mensagem TEXT,
      raw_response TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lance_logs_cnpj ON lance_logs(cnpj);
    CREATE INDEX IF NOT EXISTS idx_lance_logs_ts ON lance_logs(ts);
  `);
}
