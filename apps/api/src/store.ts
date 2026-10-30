import type { DisputaConfig } from "@licitabot/shared";
import { query } from "./db";

export interface CNPJConta { cnpj: string; apelido?: string; razaoSocial?: string; portalUser?: string; portalPass?: string; createdAt: string; updatedAt?: string; }

export async function setDisputaAuto(id: string, on: boolean): Promise<void> {
  await query("update disputas set auto=$2, updated_at=now() where id=$1", [id, on]);
}
export async function getDisputaAuto(id: string): Promise<boolean> {
  const r = await query("select auto from disputas where id=$1", [id]);
  return !!r.rows[0]?.auto;
}
export async function listAutos(): Promise<Map<string, boolean>> {
  const r = await query("select id, auto from disputas");
  return new Map(r.rows.map((x: any)=> [x.id, !!x.auto]));
}

function toDisputa(row: any, itens: any[]): DisputaConfig & { auto?: boolean } {
  return {
    id: row.id,
    processoId: row.processo_id,
    editalId: row.edital_id ?? undefined,
    cnpj: row.cnpj,
    modo: row.modo,
    dataHora: row.data_hora instanceof Date ? row.data_hora.toISOString() : String(row.data_hora),
    status: row.status,
    exequibilidade: row.exequibilidade != null ? Number(row.exequibilidade) : 50,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    auto: !!row.auto,
    itens: itens.map((it) => ({
      id: it.id,
      loteId: it.lote_id,
      descricao: it.descricao ?? undefined,
      piso: it.piso != null ? Number(it.piso) : null,
      decremento: Number(it.decremento),
      intervaloMinimo: it.intervalo_minimo != null ? Number(it.intervalo_minimo) : undefined,
      estrategia: it.estrategia,
      ativo: it.ativo,
      posicaoAlvo: it.posicao_alvo != null ? Number(it.posicao_alvo) : 1,
    })),
  };
}

export async function listCNPJs(): Promise<CNPJConta[]> {
  const r = await query("select cnpj, apelido, razao_social, portal_user, portal_pass, created_at, updated_at from cnpj_contas order by created_at asc");
  return r.rows.map((c: any) => ({ cnpj: c.cnpj, apelido: c.apelido ?? undefined, razaoSocial: c.razao_social ?? undefined, portalUser: c.portal_user ?? undefined, portalPass: c.portal_pass ?? undefined, createdAt: c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at), updatedAt: c.updated_at instanceof Date ? c.updated_at.toISOString() : undefined }));
}
export async function getCNPJ(cnpj: string): Promise<CNPJConta | null> {
  const r = await query("select cnpj, apelido, razao_social, portal_user, portal_pass, created_at, updated_at from cnpj_contas where cnpj=$1", [cnpj.replace(/\D/g,"")]);
  if(!r.rows.length) return null;
  const c=r.rows[0];
  return { cnpj:c.cnpj, apelido:c.apelido??undefined, razaoSocial:c.razao_social??undefined, portalUser:c.portal_user??undefined, portalPass:c.portal_pass??undefined, createdAt: c.created_at instanceof Date?c.created_at.toISOString():String(c.created_at), updatedAt: c.updated_at instanceof Date?c.updated_at.toISOString():undefined };
}
export async function upsertCNPJ(conta: CNPJConta): Promise<CNPJConta> {
  const r = await query(
    "insert into cnpj_contas(cnpj, apelido, razao_social, portal_user, portal_pass) values($1,$2,$3,$4,$5) on conflict(cnpj) do update set apelido=coalesce(excluded.apelido, cnpj_contas.apelido), razao_social=coalesce(excluded.razao_social, cnpj_contas.razao_social), portal_user=coalesce(excluded.portal_user, cnpj_contas.portal_user), portal_pass=coalesce(excluded.portal_pass, cnpj_contas.portal_pass) returning cnpj, apelido, razao_social, portal_user, portal_pass, created_at, updated_at",
    [conta.cnpj.replace(/\D/g,""), conta.apelido ?? null, conta.razaoSocial ?? null, conta.portalUser ?? null, conta.portalPass ?? null]
  );
  const row = r.rows[0];
  return { cnpj: row.cnpj, apelido: row.apelido ?? undefined, razaoSocial: row.razao_social ?? undefined, portalUser: row.portal_user ?? undefined, portalPass: row.portal_pass ?? undefined, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at), updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString(): undefined };
}
export async function patchCNPJ(cnpj: string, patch: Partial<CNPJConta>): Promise<CNPJConta | null> {
  const sets: string[]=[]; const vals:any[]=[]; let i=1;
  if(patch.apelido !== undefined){ sets.push(`apelido=$${i++}`); vals.push(patch.apelido); }
  if(patch.razaoSocial !== undefined){ sets.push(`razao_social=$${i++}`); vals.push(patch.razaoSocial); }
  if(patch.portalUser !== undefined){ sets.push(`portal_user=$${i++}`); vals.push(patch.portalUser); }
  if(patch.portalPass !== undefined){ sets.push(`portal_pass=$${i++}`); vals.push(patch.portalPass); }
  if(!sets.length) return getCNPJ(cnpj);
  vals.push(cnpj.replace(/\D/g,""));
  const r = await query(`update cnpj_contas set ${sets.join(", ")} where cnpj=$${i} returning cnpj, apelido, razao_social, portal_user, portal_pass, created_at, updated_at`, vals);
  if(!r.rows.length) return null;
  const row=r.rows[0];
  return { cnpj:row.cnpj, apelido:row.apelido??undefined, razaoSocial:row.razao_social??undefined, portalUser:row.portal_user??undefined, portalPass:row.portal_pass??undefined, createdAt:row.created_at instanceof Date?row.created_at.toISOString():String(row.created_at), updatedAt:row.updated_at instanceof Date?row.updated_at.toISOString():undefined };
}
export async function removeCNPJ(cnpj: string): Promise<void> {
  await query("delete from cnpj_contas where cnpj=$1", [cnpj.replace(/\D/g,"")]);
  try{ const fs=await import("fs"); const path=await import("path"); const sp=path.resolve(`storage/${cnpj.replace(/\D/g,"")}.json`); if(fs.existsSync(sp)) fs.unlinkSync(sp); const sp2=path.resolve(`apps/api/storage/${cnpj.replace(/\D/g,"")}.json`); if(fs.existsSync(sp2)) fs.unlinkSync(sp2); }catch{}
}
export async function deleteDisputa(id: string): Promise<void> {
  await query("delete from itens where disputa_id=$1", [id]);
  await query("delete from disputas where id=$1", [id]);
}

export async function listDisputas(): Promise<DisputaConfig[]> {
  const r = await query("select * from disputas order by created_at desc");
  if (!r.rows.length) return [];
  const ids = r.rows.map((x: any) => x.id);
  const itens = await query("select * from itens where disputa_id = any($1)", [ids]);
  const byDisp = new Map<string, any[]>();
  for (const it of itens.rows) { const a = byDisp.get(it.disputa_id) ?? []; a.push(it); byDisp.set(it.disputa_id, a); }
  return r.rows.map((row: any) => toDisputa(row, byDisp.get(row.id) ?? []));
}
export async function getDisputa(id: string): Promise<DisputaConfig | undefined> {
  const r = await query("select * from disputas where id=$1", [id]);
  if (!r.rows.length) return undefined;
  const itens = await query("select * from itens where disputa_id=$1", [id]);
  return toDisputa(r.rows[0], itens.rows);
}
export async function saveDisputa(d: DisputaConfig): Promise<DisputaConfig> {
  const { pool } = await import("./db");
  const client = await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("insert into cnpj_contas(cnpj) values($1) on conflict(cnpj) do nothing", [d.cnpj.replace(/\D/g,"")]);
    await client.query(
      "insert into disputas(id, processo_id, edital_id, cnpj, modo, data_hora, status, exequibilidade, created_at, updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(id) do update set processo_id=excluded.processo_id, edital_id=excluded.edital_id, cnpj=excluded.cnpj, modo=excluded.modo, data_hora=excluded.data_hora, status=excluded.status, exequibilidade=excluded.exequibilidade, updated_at=excluded.updated_at",
      [d.id, d.processoId, d.editalId ?? null, d.cnpj.replace(/\D/g,""), d.modo, new Date(d.dataHora), d.status, (d as any).exequibilidade ?? 50, new Date(d.createdAt), new Date(d.updatedAt)]
    );
    await client.query("delete from itens where disputa_id=$1", [d.id]);
    if(d.itens.length){
      const vals: any[] = []; const rows: string[] = [];
      d.itens.forEach((it, idx)=>{
        const base = idx*10;
        rows.push(`($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10})`);
        vals.push(it.id, d.id, it.loteId, it.descricao ?? null, it.piso, it.decremento, it.intervaloMinimo ?? null, it.estrategia, it.ativo, (it as any).posicaoAlvo ?? 1);
      });
      await client.query(`insert into itens(id, disputa_id, lote_id, descricao, piso, decremento, intervalo_minimo, estrategia, ativo, posicao_alvo) values ${rows.join(",")}`, vals);
    }
    await client.query("COMMIT");
  }catch(e){ await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  return (await getDisputa(d.id)) ?? d;
}
export async function panic() {
  await query("update disputas set auto=false, updated_at=now()");
  return { success: true, message: "Todas as automações foram desativadas." };
}

export interface EditalFavorito { id: string; numero?: string; objeto?: string; orgao?: string; uf?: string; municipio?: string; dataAbertura?: string; modo?: string; url?: string; }

function rowToFav(r: any): EditalFavorito {
  const j = r.edital_json ?? {};
  return {
    id: r.id,
    numero: r.numero ?? j.numero,
    objeto: r.objeto ?? j.objeto,
    orgao: r.orgao ?? j.orgao,
    uf: r.uf ?? j.uf,
    municipio: r.municipio ?? j.municipio,
    dataAbertura: r.data_abertura ?? j.dataAbertura,
    modo: r.modo ?? j.modo,
    url: r.url ?? j.url,
  };
}

export async function listFavoritos(): Promise<EditalFavorito[]> {
  const r = await query("select * from edital_favoritos order by created_at desc");
  return r.rows.map(rowToFav);
}

export async function saveFavorito(e: EditalFavorito): Promise<EditalFavorito> {
  if (!e?.id) throw new Error("id obrigatório");
  await query(
    `insert into edital_favoritos(id, numero, objeto, orgao, uf, municipio, data_abertura, modo, url, edital_json)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict(id) do update set numero=excluded.numero, objeto=excluded.objeto, orgao=excluded.orgao,
       uf=excluded.uf, municipio=excluded.municipio, data_abertura=excluded.data_abertura,
       modo=excluded.modo, url=excluded.url, edital_json=excluded.edital_json`,
    [String(e.id), e.numero ?? null, e.objeto ?? null, e.orgao ?? null, e.uf ?? null,
     e.municipio ?? null, e.dataAbertura ?? null, e.modo ?? null, e.url ?? null, JSON.stringify(e)]
  );
  return e;
}

export async function removeFavorito(id: string): Promise<void> {
  await query("delete from edital_favoritos where id=$1", [String(id)]);
}
