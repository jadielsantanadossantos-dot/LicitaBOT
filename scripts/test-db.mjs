import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const cs = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
if (!cs) { console.error("DATABASE_URL ausente"); process.exit(1); }
const useSsl = /supabase\.co/.test(cs);
const pool = new pg.Pool({ connectionString: cs, ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}) });
await pool.query("insert into cnpj_contas(cnpj,apelido) values($1,$2) on conflict(cnpj) do update set apelido=excluded.apelido", ["32977510000100","teste"]);
const r = await pool.query("select * from cnpj_contas");
console.log(JSON.stringify(r.rows));
await pool.query("delete from cnpj_contas where cnpj=$1", ["32977510000100"]);
console.log("CRUD_OK");
await pool.end();
