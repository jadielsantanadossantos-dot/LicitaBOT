// Copia os dados do Supabase (ou qualquer origem) para o banco local.
// Uso (PowerShell):
//   node scripts/db-migrar-para-local.mjs "<SUPABASE_URL>" "<LOCAL_URL>" [--com-logs]
// --com-logs: traz também os últimos 5000 lance_logs (sem ele, logs ficam só na origem).
// Idempotente: usa ON CONFLICT DO NOTHING quando a tabela tem restrição única na chave.
import pg from "pg";

const args = process.argv.slice(2);
const fromUrl = args.find((a) => !a.startsWith("--"));
const toUrl = args.filter((a) => !a.startsWith("--"))[1];
const comLogs = args.includes("--com-logs");
if (!fromUrl || !toUrl) {
  console.error('Uso: node scripts/db-migrar-para-local.mjs "<SUPABASE_URL>" "<LOCAL_URL>" [--com-logs]');
  process.exit(1);
}
const opt = (cs) => ({ connectionString: cs, ...(/supabase\.co/.test(cs) ? { ssl: { rejectUnauthorized: false } } : {}) });
const src = new pg.Pool({ ...opt(fromUrl), connectionTimeoutMillis: 15000 });
const dst = new pg.Pool({ ...opt(toUrl), connectionTimeoutMillis: 15000 });

async function columns(pool, table) {
  const r = await pool.query("select column_name from information_schema.columns where table_name=$1", [table]);
  return r.rows.map((x) => x.column_name);
}
async function hasUnique(pool, table, column) {
  const r = await pool.query(
    `select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid
     join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
     where t.relname = $1 and a.attname = $2 and c.contype in ('p','u') limit 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function copy(table, key, orderBy) {
  const sc = await columns(src, table);
  const dc = await columns(dst, table);
  const common = sc.filter((c) => dc.includes(c));
  if (!common.length) { console.log(`${table}: sem colunas em comum, skip`); return; }
  const list = common.map((c) => `"${c}"`).join(",");
  const rows = (await src.query(`select ${list} from "${table}"${orderBy ? ` order by ${orderBy}` : ""}`)).rows;
  if (!rows.length) { console.log(`${table}: 0 linhas na origem`); return; }
  const upsert = key && common.includes(key) && (await hasUnique(dst, table, key));
  const conflict = upsert ? ` on conflict ("${key}") do nothing` : "";
  const client = await dst.connect();
  let n = 0;
  try {
    await client.query("BEGIN");
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const vals = [];
      const tuples = chunk.map((row, ri) => {
        const ph = common.map((c, ci) => `$${ri * common.length + ci + 1}`);
        for (const c of common) vals.push(row[c]);
        return `(${ph.join(",")})`;
      });
      await client.query(`insert into "${table}" (${list}) values ${tuples.join(",")}${conflict}`, vals);
      n += chunk.length;
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); }
  console.log(`${table}: ${n}/${rows.length} linhas${upsert ? " (upsert)" : ""}`);
}

try {
  console.log("origem: " + fromUrl.replace(/:[^@]+@/, ":***@").slice(0, 90));
  console.log("destino: " + toUrl.replace(/:[^@]+@/, ":***@").slice(0, 90));
  await copy("cnpj_contas", "cnpj");
  await copy("disputas", "id");
  await copy("itens", "id");
  await copy("edital_favoritos", "id");
  if (comLogs) {
    // Traz os mais recentes sem o id (serial gera de novo no destino)
    const sc = await columns(src, "lance_logs");
    const dc = await columns(dst, "lance_logs");
    const common = sc.filter((c) => dc.includes(c) && c !== "id");
    const list = common.map((c) => `"${c}"`).join(",");
    const rows = (await src.query(`select ${list} from lance_logs order by id desc limit 5000`)).rows;
    const client = await dst.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const vals = [];
        const tuples = chunk.map((row, ri) => {
          const ph = common.map((c, ci) => `$${ri * common.length + ci + 1}`);
          for (const c of common) vals.push(row[c]);
          return `(${ph.join(",")})`;
        });
        await client.query(`insert into lance_logs (${list}) values ${tuples.join(",")}`, vals);
      }
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
    console.log(`lance_logs: ${rows.length} linhas recentes`);
  } else {
    console.log("lance_logs: pulado (use --com-logs p/ trazer os 5000 recentes)");
  }
  const checks = await Promise.all(
    ["cnpj_contas", "disputas", "itens"].map((t) => dst.query(`select count(*) as c from "${t}"`).then((r) => `${t}=${r.rows[0].c}`))
  );
  console.log("DESTINO: " + checks.join(" "));
  console.log("MIGRACAO_OK");
} catch (e) {
  console.error("FAIL " + String(e.message).slice(0, 300));
  process.exit(1);
} finally { await src.end(); await dst.end(); }
