import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";
for (const p of [".env", "apps/api/.env"]) try { dotenv.config({ path: p }); } catch {}
const urlArg = process.argv.find((a) => a.startsWith("--url="));
const cs = (urlArg ? urlArg.slice("--url=".length) : process.env.DATABASE_URL || process.env.DIRECT_URL) || "";
if (!cs) { console.error("DATABASE_URL ausente — configure .env"); process.exit(1); }
const safe = cs.replace(/:[^@]+@/, ":***@").slice(0, 120);
console.log("alvo:", safe);
const useSsl = /supabase\.co/.test(cs);
const pool = new pg.Pool({
  connectionString: cs,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  connectionTimeoutMillis: 15000,
});
const files = ["001_init.sql", "002_multi_empresa.sql", "003_exequibilidade.sql", "004_favoritos.sql", "006_relax_piso.sql"];
try {
  for (const f of files) {
    const p = path.resolve("apps/api/migrations", f);
    if (!fs.existsSync(p)) { console.log("skip (ausente):", f); continue; }
    const sql = fs.readFileSync(p, "utf8");
    console.log("aplicando", f, `(${sql.length} chars)`);
    try {
      await pool.query(sql);
    } catch (e) {
      if (/already exists|duplicate|j. existe/i.test(e.message)) { console.log("  já aplicado, seguindo:", e.message.slice(0, 100)); continue; }
      throw e;
    }
  }
  await pool.query("ALTER TABLE disputas ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT false").catch(() => {});
  await pool.query("ALTER TABLE itens ADD COLUMN IF NOT EXISTS posicao_alvo INTEGER NOT NULL DEFAULT 1").catch(() => {});
  await pool.query("ALTER TABLE cnpj_contas ADD COLUMN IF NOT EXISTS apelido TEXT").catch(() => {});
  const r = await pool.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
  console.log("TABLES:", r.rows.map((x) => x.table_name).join(","));
  console.log("DB_INIT_OK");
} catch (e) {
  console.error("FAIL", e.message);
  process.exit(1);
} finally { await pool.end(); }
