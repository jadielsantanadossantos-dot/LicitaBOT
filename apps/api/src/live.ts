import { isSessionValid, loginWithCredentials } from "@licitabot/portal";
import { obterHoraServidor, obterHtmlAba, parseItens, parsePosicaoNumero, obterChat, obterStatus, enviarLanceViaFetch, fetchRanking, type ItemSessao, type ChatMsg } from "@licitabot/portal";
import { query } from "./db";

export const liveState = new Map<string, { itens: ItemSessao[]; chat: ChatMsg[]; status: string; hora: string | null; updatedAt: string; error?: string }>();

export const lanceLog: { ts: string; licitacaoId: string; itemId: string; valor: number; cnpj: string; ok: boolean; msg: string }[] = [];
const MAX_LOG = 500;
function pushLog(e: typeof lanceLog[number]){ lanceLog.unshift(e); if(lanceLog.length>MAX_LOG) lanceLog.length=MAX_LOG; }
export function liveKey(licitacaoId: string, cnpj: string){ return `${String(licitacaoId)}:${String(cnpj).replace(/\D/g,"")}`; }

// Cooldown por item após rejeição do portal: evita retentar todo tick (1.5s)
// contra regras de intervalo e reduz carga/WAF. Chave = cnpj:sessItemId.
const lanceCooldown = new Map<string, number>();
function cooldownKey(cnpj: string, itemId: string){ return `${cnpj.replace(/\D/g,"")}:${String(itemId)}`; }
export function isLanceCooldown(cnpj: string, itemId: string): boolean {
  const k = cooldownKey(cnpj, itemId);
  const ate = lanceCooldown.get(k) ?? 0;
  if (ate > Date.now()) return true;
  if (ate) lanceCooldown.delete(k);
  return false;
}
function aplicarCooldownRejeicao(cnpj: string, itemId: string, mensagem: string) {
  const m = mensagem || "";
  let ms = 0; let motivo = "";
  if (/entre seus lances/i.test(m) && /20 segundos/i.test(m)) { ms = 25000; motivo = "20s-proprios"; }
  else if (/intervalo entre os lances/i.test(m)) { ms = 4000; motivo = "3s-geral"; }
  else if (/seu lance atual/i.test(m)) { ms = 5000; motivo = "proprio-lance"; }
  if (ms > 0) {
    if (lanceCooldown.size > 5000) { const agora = Date.now(); for (const [k, v] of lanceCooldown) if (v <= agora) lanceCooldown.delete(k); }
    lanceCooldown.set(cooldownKey(cnpj, itemId), Date.now() + ms);
    console.log(`[live] cooldown ${motivo} ${ms / 1000}s item=${itemId} cnpj=${String(cnpj).slice(-4)}`);
  }
}

let reloginInFlight = new Map<string, Promise<boolean>>();
// Backoff: evita martelar login/WAF quando a sessão está morta.
// Falha comum = 5min; com captcha WAF ativo = 15min (só humano resolve).
const reloginBloqueadoAte = new Map<string, number>();
const wafAte = new Map<string, number>();
const BACKOFF_FALHA_MS = 5 * 60 * 1000;
const BACKOFF_WAF_MS = 15 * 60 * 1000;

export function sessaoBloqueadaAte(cnpj: string): number {
  return reloginBloqueadoAte.get(cnpj.replace(/\D/g, "")) ?? 0;
}
export function isWafAtivo(cnpj: string): boolean {
  return (wafAte.get(cnpj.replace(/\D/g, "")) ?? 0) > Date.now();
}

export async function ensureSession(cnpj: string): Promise<boolean> {
  const clean = cnpj.replace(/\D/g, "");
  if (await isSessionValid(cnpj)) { reloginBloqueadoAte.delete(clean); return true; }
  if (reloginInFlight.has(cnpj)) return reloginInFlight.get(cnpj)!;
  if ((reloginBloqueadoAte.get(clean) ?? 0) > Date.now()) return false;
  const p = (async ()=>{
    // Antes de abrir browser: checa se é captcha WAF (só humano resolve — não adianta tentar login)
    try {
      const { checkSessao } = await import("@licitabot/portal");
      const estado = await checkSessao(cnpj);
      if (estado === "waf") {
        console.log(`[live] WAF/captcha ativo para ${cnpj} — aguardando resolução manual (sem novas tentativas por ${BACKOFF_WAF_MS / 60000}min)`);
        wafAte.set(clean, Date.now() + BACKOFF_WAF_MS);
        reloginBloqueadoAte.set(clean, Date.now() + BACKOFF_WAF_MS);
        return false;
      }
      if (estado === "ok") { reloginBloqueadoAte.delete(clean); return true; }
    } catch {}
    console.log(`[live] sessão expirada ${cnpj} — relogin`);
    const ok = await loginWithCredentials(cnpj);
    console.log(`[live] relogin ${cnpj} => ${ok}`);
    if (ok && await isSessionValid(cnpj)) { reloginBloqueadoAte.delete(clean); return true; }
    reloginBloqueadoAte.set(clean, Date.now() + BACKOFF_FALHA_MS);
    if(!ok) await new Promise(r=> setTimeout(r, 2000));
    return false;
  })();
  reloginInFlight.set(cnpj, p);
  const res = await p;
  reloginInFlight.delete(cnpj);
  return res;
}

async function fetchPagina(cnpj: string, licitacaoId: string, p: number, tentativas = 3): Promise<string> {
  for (let t = 1; t <= tentativas; t++) {
    try {
      const h = await obterHtmlAba(cnpj, licitacaoId, 0, p, 1);
      if (h) return h;
    } catch {}
    if (t < tentativas) await new Promise(r => setTimeout(r, 400 * t));
  }
  return "";
}

async function fetchAllItens(cnpj: string, licitacaoId: string): Promise<ItemSessao[]> {
  const html = await fetchPagina(cnpj, licitacaoId, 1);
  if(!html) return [];
  const first = parseItens(html);
  if(!first.length) return [];
  if(first.length < 10) return first;
  const all: ItemSessao[] = [...first];
  const seen = new Set(first.map(x=>x.id));
  // Paginação até 50 páginas x ~10 = 500 itens (antes parava em 12x10=120 e cortava pregões grandes como 127)
  const MAX_PAGINAS = 50;
  for(let p=2; p<=MAX_PAGINAS; p++){
    const h = await fetchPagina(cnpj, licitacaoId, p);
    if(!h) break; // página inacessível após retries = fim (ou instabilidade — tickLive mantém cache anterior se parcial)
    const itens = parseItens(h);
    if(!itens.length) break;
    let added=0;
    for(const it of itens){ if(!seen.has(it.id)){ seen.add(it.id); all.push(it); added++; } }
    // Página repetida (portal devolveu os mesmos itens) = fim
    if(added === 0) break;
    if(itens.length < 10) break;
    if(p < MAX_PAGINAS) await new Promise(r=> setTimeout(r, 120));
  }
  return all;
}

export async function tickLive(licitacaoId: string, cnpj: string) {
  const k = liveKey(licitacaoId, cnpj);
  const hasSession = await ensureSession(cnpj);
  if (!hasSession) {
    const waf = isWafAtivo(cnpj);
    liveState.set(k, { itens: liveState.get(k)?.itens ?? [], chat: liveState.get(k)?.chat ?? [], status: waf ? "bloqueio WAF/captcha do portal — resolução manual necessária" : "sessão expirada — relogin falhou", hora: null, updatedAt: new Date().toISOString(), error: waf ? "waf_challenge" : "session_expired" });
    return;
  }
  try{
    const prev = liveState.get(k);
    const ultimoId = prev?.chat?.length ? Math.max(...prev.chat.map(m=> Number(m.id)||0)) : 0;
    const [hora, status, chat, itens] = await Promise.all([
      obterHoraServidor(cnpj).catch(()=> null),
      obterStatus(cnpj, licitacaoId).catch(()=> ""),
      obterChat(cnpj, licitacaoId, ultimoId).catch(()=> ({ mensagens: [] as ChatMsg[] })),
      fetchAllItens(cnpj, licitacaoId).catch(()=> [] as ItemSessao[]),
    ]);
    const finalItensRaw = (() => {
      const prevItens = prev?.itens ?? [];
      if (!itens.length) return prevItens;
      if (!prevItens.length) return itens;
      if (itens.length < prevItens.length) {
        const byId = new Map(itens.map(x => [String(x.id), x]));
        const byNum = new Map(itens.map(x => [String(x.numero), x]));
        const merged: ItemSessao[] = [];
        for (const p of prevItens) {
          const fresh = byId.get(String(p.id)) ?? byNum.get(String(p.numero));
          merged.push(fresh ?? p);
        }
        const prevIds = new Set(prevItens.map(x => String(x.id)));
        for (const n of itens) if (!prevIds.has(String(n.id))) merged.push(n);
        if (itens.length < prevItens.length * 0.8) {
          console.log(`[live] ${licitacaoId}/${cnpj} paginação parcial (${itens.length}/${prevItens.length}) — merge mantendo ${merged.length} itens`);
        }
        return merged;
      }
      return itens;
    })();
    const finalItens = (() => {
      const prevItens = prev?.itens ?? [];
      if (!prevItens.length) return finalItensRaw;
      const prevById = new Map(prevItens.map(p => [String(p.id), p]));
      const prevByNum = new Map(prevItens.map(p => [String(p.numero), p]));
      return finalItensRaw.map(it => {
        if (it.descricao && String(it.descricao).trim()) return it;
        const prv = prevById.get(String(it.id)) ?? prevByNum.get(String(it.numero)) ?? null;
        if (prv?.descricao) return { ...it, descricao: prv.descricao };
        return it;
      });
    })();
    const newMsgs = ((chat as any)?.mensagens ?? []) as ChatMsg[];
    let merged: ChatMsg[] = [];
    if(prev?.chat?.length){
      const map = new Map<string, ChatMsg>();
      for(const m of prev.chat) map.set(String(m.id), m);
      for(const m of newMsgs) map.set(String(m.id), m);
      merged = [...map.values()];
    } else {
      merged = [...newMsgs];
    }
    merged.sort((a,b)=> Number(b.id) - Number(a.id));
    if(merged.length > 500) merged = merged.slice(0, 500);
    const finalHora = hora ? (hora as Date).toISOString() : (prev?.hora ?? null);
    const finalStatus = status || prev?.status || "";
    liveState.set(k, { itens: finalItens, chat: merged, status: finalStatus, hora: finalHora, updatedAt: new Date().toISOString() });
  }catch(e:any){
    const prev = liveState.get(k);
    liveState.set(k, { itens: prev?.itens ?? [], chat: prev?.chat ?? [], status: prev?.status ?? "", hora: prev?.hora ?? null, updatedAt: new Date().toISOString(), error: e.message?.slice(0,400) });
  }
}

let pollTimer: NodeJS.Timeout | null = null;
const polls = new Map<string, { licitacaoId: string; cnpj: string }>();
function msDeTempo(t: string | undefined | null): number | null {
  if (!t) return null;
  const m = t.match(/(\d+):(\d+):(\d+)/) ?? t.match(/(\d+):(\d+)/);
  if (!m) return null;
  if (m.length === 4) return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}
// Tier de polling (508293): reta final e desempate precisam de 1.2-2s; normal 3.5s evita WAF
function pollTier(): "critico" | "quente" | "normal" {
  let quente = false;
  for (const v of liveState.values()) {
    for (const it of v.itens) {
      const ms = msDeTempo(it.tempo);
      if (ms != null && ms < 15000) return "critico";
      if (ms != null && ms < 30000) quente = true;
      const pr = String((it as any).posicaoRaw ?? "").toLowerCase();
      if (pr.includes("empat") || (it as any).estaVencendo === false) quente = true;
    }
  }
  return quente ? "quente" : "normal";
}
function isUrgent(): boolean {
  return pollTier() !== "normal";
}
export function watchLicitacao(licitacaoId: string, cnpj: string){
  const k = liveKey(licitacaoId, cnpj);
  polls.set(k, { licitacaoId: String(licitacaoId), cnpj: String(cnpj).replace(/\D/g,"") });
  if(!pollTimer) startPoll();
  tickLive(licitacaoId, cnpj);
}
export function unwatchLicitacao(licitacaoId: string, cnpj?: string){
  if(cnpj){
    polls.delete(liveKey(licitacaoId, cnpj));
  } else {
    for(const k of [...polls.keys()]) if(k.startsWith(`${String(licitacaoId)}:`)) polls.delete(k);
  }
}
function startPoll(){
  if(pollTimer) return;
  const loop = async ()=>{
    const entries = [...polls.values()];
    await Promise.all(entries.map(({ licitacaoId, cnpj })=> tickLive(licitacaoId, cnpj).catch(()=>{})));
    if(!polls.size){ if(pollTimer) clearInterval(pollTimer as any); pollTimer=null; return; }
    // crítico (<15s p/ fechar): 1.2s | quente (desempate/<30s): 2s | normal: 3.5s + jitter 1s
    const tier = pollTier();
    const baseDelay = tier === "critico" ? 1200 : tier === "quente" ? 2000 : 3500;
    const jitter = Math.random() * 1000; // Adiciona até 1 segundo de variação
    const delay = baseDelay + jitter;
    pollTimer = setTimeout(loop, delay) as any;
  };
  pollTimer = setTimeout(loop, isUrgent() ? 1500 : 3500) as any;
}
// Keepalive 30s: sessão morta = bot cego; isSessionValid é 1 GET leve no DashBoard por CNPJ
setInterval(async ()=>{
  const cnpjs = [...new Set([...polls.values()].map(v=> typeof v === "string" ? v : (v as any).cnpj))];
  await Promise.all(cnpjs.map(async (cnpj)=>{
    const ok = await isSessionValid(cnpj).catch(()=> false);
    if(!ok) await ensureSession(cnpj).catch(()=>{});
    else { try{ await obterHoraServidor(cnpj); }catch{} }
  }));
}, 30000);

export async function enviarLance(licitacaoId: string, cnpj: string, itemId: string, valor: number){
  const has = await ensureSession(cnpj);
  if(!has){
    const motivo = isWafAtivo(cnpj) ? "bloqueio WAF/captcha — resolva manualmente e reconecte" : "sessão expirada e relogin falhou";
    try {
      await query("insert into lance_logs(licitacao_id, item_id, valor, cnpj, ok, mensagem, raw_response) values($1, $2, $3, $4, $5, $6, $7)",
        [licitacaoId, itemId, valor, cnpj, false, motivo, ""]);
    } catch(e) { console.error("[live] erro ao salvar log de lance (sem sessão)", e); }
    pushLog({ ts: new Date().toISOString(), licitacaoId, itemId, valor, cnpj, ok: false, msg: motivo });
    return { ok:false, mensagem: motivo, raw:"" };
  }
  const r = await enviarLanceViaFetch(cnpj, licitacaoId, itemId, valor);
  if (!r.ok) aplicarCooldownRejeicao(cnpj, itemId, r.mensagem);
  
  // LOG AUDITÁVEL
  try {
    await query("insert into lance_logs(licitacao_id, item_id, valor, cnpj, ok, mensagem, raw_response) values($1, $2, $3, $4, $5, $6, $7)", 
      [licitacaoId, itemId, valor, cnpj, r.ok, r.mensagem, r.raw]);
  } catch(e) { console.error("[live] erro ao salvar log de lance", e); }

  if(!r.ok && r.mensagem.toLowerCase().includes("sessão expirada")){
    const ok2 = await ensureSession(cnpj);
    if(ok2){ 
      const r2 = await enviarLanceViaFetch(cnpj, licitacaoId, itemId, valor); 
      try {
        await query("insert into lance_logs(licitacao_id, item_id, valor, cnpj, ok, mensagem, raw_response) values($1, $2, $3, $4, $5, $6, $7)", 
          [licitacaoId, itemId, valor, cnpj, r2.ok, r2.mensagem, r2.raw]);
      } catch(e) { console.error("[live] erro ao salvar log de lance (retry)", e); }
      pushLog({ ts: new Date().toISOString(), licitacaoId, itemId, valor, cnpj, ok: r2.ok, msg: r2.mensagem.slice(0,400) }); 
      if (!r2.ok) aplicarCooldownRejeicao(cnpj, itemId, r2.mensagem);
      return r2; 
    }
  }
  pushLog({ ts: new Date().toISOString(), licitacaoId, itemId, valor, cnpj, ok: r.ok, msg: r.mensagem.slice(0,400) });
  return r;
}

export function getLive(licitacaoId: string, cnpj?: string){
  if(cnpj) return liveState.get(liveKey(licitacaoId, cnpj)) ?? null;
  const direct = liveState.get(licitacaoId);
  if(direct) return direct;
  for(const [k,v] of liveState) if(k.startsWith(`${String(licitacaoId)}:`)) return v;
  return null;
}
