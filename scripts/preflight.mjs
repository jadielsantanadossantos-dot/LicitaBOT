import pg from "pg";
import net from "node:net";
import dotenv from "dotenv";
for (const p of [".env", "apps/api/.env"]) try { dotenv.config({ path: p }); } catch {}
const cs = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
const out = [];
// 1. Banco (somente leitura)
if (!cs) {
  out.push("DB: SEM DATABASE_URL");
} else {
  const useSsl = /supabase\.co/.test(cs);
  const pool = new pg.Pool({ connectionString: cs, ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}), connectionTimeoutMillis: 12000 });
  try {
    await pool.query("select 1");
    out.push("DB: conecta OK (" + (useSsl ? "supabase" : "local") + ")");
    const pa = await pool.query("select 1 from information_schema.columns where table_name='itens' and column_name='posicao_alvo'");
    out.push("DB_POS_ALVO: " + (pa.rows.length ? "OK" : "AUSENTE -> setupDb cria no boot"));
    const piso = await pool.query("select is_nullable from information_schema.columns where table_name='itens' and column_name='piso'");
    out.push("DB_PISO_NULLABLE: " + (piso.rows[0]?.is_nullable === "YES" ? "OK" : "RIGIDO -> setupDb relaxa no boot"));
    const cnpjs = await pool.query("select cnpj from cnpj_contas order by created_at asc");
    out.push("CNPJS: " + (cnpjs.rows.map((x) => x.cnpj).join(",") || "nenhum"));
    const disp = await pool.query("select id, status from disputas order by updated_at desc limit 5");
    out.push("DISPUTAS: " + (disp.rows.length ? JSON.stringify(disp.rows) : "nenhuma"));
  } catch (e) {
    out.push("DB_FALHA: " + String(e.message).slice(0, 200));
  } finally { await pool.end(); }
}
// 2. Portas
function chk(p) {
  return new Promise((res) => {
    const s = net.connect(p, "127.0.0.1");
    s.on("connect", () => { s.end(); res("porta " + p + ": OCUPADA"); });
    s.on("error", () => res("porta " + p + ": livre"));
    setTimeout(() => res("porta " + p + ": timeout"), 2000);
  });
}
out.push(await chk(3001));
out.push(await chk(3000));
console.log(out.join("\n"));
