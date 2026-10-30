import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await pool.query("delete from disputas where processo_id='123'");
await pool.query("delete from cnpj_contas where apelido='teste'");
const r = await pool.query("select count(*) c from cnpj_contas");
console.log("cnpjs", r.rows[0].c);
await pool.end();
