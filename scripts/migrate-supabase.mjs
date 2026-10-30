import fs from "fs";
import pg from "pg";
import dotenv from "dotenv";
for (const p of [".env", "apps/api/.env"]) try { dotenv.config({ path: p }); } catch {}
const cs = process.env.DATABASE_URL || process.env.DIRECT_URL;
console.log("host:", cs.replace(/:[^@]+@/, ":***@").slice(0,120));
const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
try {
  const sql = fs.readFileSync("apps/api/migrations/001_init.sql", "utf8");
  console.log("sql len", sql.length);
  await pool.query(sql);
  console.log("MIGRATION_OK");
  const r = await pool.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
  console.log("TABLES:", r.rows.map((x) => x.table_name).join(","));
  const r2 = await pool.query("select count(*) as c from cnpj_contas");
  console.log("cnpj_contas", r2.rows[0].c);
  const r3 = await pool.query("select count(*) as c from disputas");
  console.log("disputas", r3.rows[0].c);
} catch (e) {
  console.error("FAIL", e.message);
  console.error(e.stack?.slice(0,3000));
  process.exit(1);
} finally { await pool.end(); }
