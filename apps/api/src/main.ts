import "./config";
import express from "express";
import cors from "cors";
import { config } from "./config";
import { buscarEditais } from "@licitabot/portal";
import { listCNPJs } from "./store";
import { startScheduler, agendaSnapshot } from "./scheduler";
import { enviarLance, lanceLog, getLive, isLanceCooldown } from "./live";
import { isSessionValid, getCookiesHeader, obterHtmlAba, parseItens, obterHoraServidor, obterChat, obterStatus } from "@licitabot/portal";
import { startEngine } from "./engine-runner";
import { setupDb } from "./db";
import cnpjsRouter from "./routes/cnpjs";
import editaisRouter from "./routes/editais";
import disputasRouter from "./routes/disputas";
import liveRouter from "./routes/live";
import authRouter from "./routes/auth";

async function firstCnpj(): Promise<string|undefined>{ const l=await listCNPJs(); return l[0]?.cnpj; }

const app = express();
app.use(cors({ origin:"*" }));
app.use(express.json({ limit:"1mb" }));

app.get("/health", (_req,res)=> res.json({ ok:true, db:"postgres" }));
app.get("/health/redis", async (_req,res)=>{
  try{
    const { isRedisAvailable } = await import("./queue-bull");
    const ok = await isRedisAvailable();
    res.json({ redis: ok ? "connected" : "fallback-memoria", redisUrlSet: !!(process.env.REDIS_URL||"") });
  }catch(e:any){ res.json({ redis:"error", error: e.message }); }
});

app.use("/api/auth", authRouter);
app.use("/api/cnpjs", cnpjsRouter);
app.use("/api/editais", editaisRouter);
app.use("/api/disputas", disputasRouter);
app.use("/api/live", liveRouter);

// No topo do main.ts
let alertasPorCnpj: Record<string, string[]> = {};

export const getEstadoEstrategia = (cnpj: string) => estrategiasPorCnpj[cnpj] || { alvo: 1, decremento: 0.01, ativo: false };
export const adicionarAlerta = (cnpj: string, msg: string) => {
  if (!alertasPorCnpj[cnpj]) alertasPorCnpj[cnpj] = [];
  alertasPorCnpj[cnpj].push(msg);
};

app.post("/api/config/estrategia", async (req, res, next) => {
  try {
    const { cnpj, ...config } = req.body;
    if (!cnpj) return res.status(400).json({ error: "CNPJ é obrigatório" });
    
    estrategiasPorCnpj[cnpj] = { 
      ...(estrategiasPorCnpj[cnpj] || { alvo: 1, decremento: 0.01, ativo: false }), 
      ...config 
    };
    estrategiasPorCnpj[cnpj].ativo = String(estrategiasPorCnpj[cnpj].ativo) === 'true';
    
    console.log(`[config] Estratégia atualizada para ${cnpj}:`, estrategiasPorCnpj[cnpj]);
    res.json({ ok: true, config: estrategiasPorCnpj[cnpj] });
  } catch (e) { next(e); }
});

app.get("/api/config/estrategia", (req, res) => {
  const cnpj = String(req.query.cnpj || "");
  res.json(getEstadoEstrategia(cnpj));
});

app.get("/api/alertas", (req, res) => {
  const cnpj = String(req.query.cnpj || "");
  const msg = (alertasPorCnpj[cnpj] || []).shift() || null;
  res.json({ mensagem: msg });
});

app.post("/api/update-session", async (req, res, next) => {
  try {
    const { cnpj, cookies } = req.body;
    if (!cnpj || !cookies) return res.status(400).json({ error: "cnpj e cookies obrigatórios" });
    const { saveStorage } = await import("@licitabot/portal");
    saveStorage(cnpj, { cookies, origins: [] });
    console.log(`[session] Cookies atualizados via extensão para CNPJ: ${cnpj}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.get("/api/agenda", async (_req,res,next)=>{ try{ res.json(await agendaSnapshot()); }catch(e){ next(e);} });
app.get("/api/hora", async (req,res,next)=>{ try{ const cnpj=String(req.query.cnpj||"")||await firstCnpj()||undefined; const h=cnpj?await obterHoraServidor(cnpj):await obterHoraServidor(); res.json({ hora: h?h.toISOString():null, local:new Date().toISOString() }); }catch(e){ next(e);} });
app.post("/api/lance", async (req,res,next)=>{
  try{
    const licitacaoId=String(req.body.licitacaoId||req.body.processoId||"");
    const itemId=String(req.body.itemId||req.body.loteId||"");
    const valor=Number(req.body.valor);
    const cnpj=String(req.body.cnpj||"").replace(/\D/g,"");
    if(!licitacaoId||!itemId||!valor||!cnpj) return res.status(400).json({ error:"licitacaoId, itemId, valor, cnpj obrigatórios" });
    if(isLanceCooldown(cnpj,itemId)) return res.status(429).json({ error:"aguarde cooldown 20s/3s do portal", retryAfterMs: 3000 });
    const r=await enviarLance(licitacaoId,cnpj,itemId,valor);
    res.status(r.ok?200:400).json(r);
  }catch(e){ next(e); }
});
app.get("/api/lances/log", (_req,res)=> res.json(lanceLog.slice(0,50)));
// Fase 4: histórico auditável com filtros (DB; cai p/ memória se DB fora)
app.get("/api/lance_logs", async (req,res,next)=>{
  try{
    const { query } = await import("./db");
    const lic = req.query.licitacao ? String(req.query.licitacao) : null;
    const item = req.query.item ? String(req.query.item) : null;
    const cnpj = req.query.cnpj ? String(req.query.cnpj).replace(/\D/g,"") : null;
    const ok = req.query.ok !== undefined && req.query.ok !== "" ? String(req.query.ok) === "true" : null;
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
    const conds: string[] = []; const vals: any[] = []; let i = 1;
    if (lic) { conds.push(`licitacao_id=$${i++}`); vals.push(lic); }
    if (item) { conds.push(`item_id=$${i++}`); vals.push(item); }
    if (cnpj) { conds.push(`regexp_replace(cnpj,'\\D','','g')=$${i++}`); vals.push(cnpj); }
    if (ok !== null) { conds.push(`ok=$${i++}`); vals.push(ok); }
    const where = conds.length ? `where ${conds.join(" and ")}` : "";
    const r = await query(`select id, ts, licitacao_id as "licitacaoId", item_id as "itemId", valor, cnpj, ok, mensagem as msg from lance_logs ${where} order by ts desc limit $${i}`, [...vals, limit]);
    res.json(r.rows);
  }catch(e){
    // DB fora: devolve o log em memória filtrado na mão
    try{
      const lic = req.query.licitacao ? String(req.query.licitacao) : null;
      const item = req.query.item ? String(req.query.item) : null;
      const cnpj = req.query.cnpj ? String(req.query.cnpj).replace(/\D/g,"") : null;
      const ok = req.query.ok !== undefined && req.query.ok !== "" ? String(req.query.ok) === "true" : null;
      const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
      res.json(lanceLog
        .filter(l => (!lic || l.licitacaoId === lic) && (!item || l.itemId === item)
          && (!cnpj || String(l.cnpj).replace(/\D/g,"") === cnpj) && (ok === null || l.ok === ok))
        .slice(0, limit));
    }catch(e2){ next(e2); }
  }
});
app.get("/api/pregoes/participando", async (req,res,next)=>{
  try{
    const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!cnpj) return res.status(400).json({ error:"nenhum CNPJ cadastrado" });
    const { buscarSeusPregoes } = await import("@licitabot/portal");
    const r=await buscarSeusPregoes(cnpj, { situacao: req.query.situacao ? String(req.query.situacao) : undefined, q: req.query.q ? String(req.query.q) : undefined } as any);
    res.json(r);
  }catch(e){ next(e); }
});
app.get("/api/pregoes", async (req,res,next)=>{
  try{
    const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!cnpj) return res.status(400).json({ error:"nenhum CNPJ cadastrado" });
    const dataAbertura=String(req.query.dataAbertura||req.query.data||"")||undefined;
    const dataDe=String(req.query.dataDe||dataAbertura||"")||undefined;
    const dataAte=String(req.query.dataAte||dataAbertura||"")||undefined;
    const r=await buscarEditais({ q:req.query.q as any, uf:req.query.uf as any, page:Number(req.query.pagina||1), pageSize:50, dataDe, dataAte, dataAbertura } as any, cnpj);
    res.json(r);
  }catch(e){ next(e); }
});
app.get("/api/ranking/:licitacaoId/:itemId", async (req,res,next)=>{
  try{
    const licitacaoId=String(req.params.licitacaoId); const itemId=String(req.params.itemId);
    const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!licitacaoId||!itemId||!cnpj) return res.status(400).json({ error:"licitacaoId, itemId, cnpj obrigatórios" });
    const { fetchRanking } = await import("@licitabot/portal");
    res.json(await fetchRanking(cnpj,licitacaoId,itemId));
  }catch(e){ next(e); }
});
app.get("/api/sessao", async (req,res,next)=>{
  try{
    const id=String(req.query.id||""); const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!id||!cnpj) return res.status(400).json({ error:"id e cnpj obrigatórios" });
    const { isWafAtivo, sessaoBloqueadaAte } = await import("./live");
    const valida = await isSessionValid(cnpj).catch(()=> false);
    const waf = isWafAtivo(cnpj);
    const bloqueadaAte = sessaoBloqueadaAte(cnpj);
    const sessaoEstado = valida ? "ok" : waf ? "waf" : bloqueadaAte > Date.now() ? "bloqueada" : "expirada";
    // Com sessão morta não adianta bater no portal: retorna estado explícito em vez de itens:[] silencioso
    const html = valida ? await obterHtmlAba(cnpj,id,0,1,1) : "";
    res.json({ itens: html ? parseItens(html) : [], htmlLen: html.length, sessaoValida: valida, waf, bloqueadaAte, sessaoEstado });
  }catch(e){ next(e); }
});
app.get("/api/chat", async (req,res,next)=>{
  try{
    const id=String(req.query.id||""); const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    const ultimo=Number(req.query.ultimo||0);
    if(!id||!cnpj) return res.status(400).json({ error:"id e cnpj obrigatórios" });
    res.json(await obterChat(cnpj,id,ultimo));
  }catch(e){ next(e); }
});
app.get("/api/status", async (req,res,next)=>{
  try{
    const id=String(req.query.id||""); const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!id||!cnpj) return res.status(400).json({ error:"id e cnpj obrigatórios" });
    res.json({ status: await obterStatus(cnpj,id) });
  }catch(e){ next(e); }
});
app.get("/api/sessao/valid", async (req,res,next)=>{
  try{
    const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!cnpj) return res.status(400).json({ error:"cnpj obrigatório" });
    const ok=await isSessionValid(cnpj); const ck=await getCookiesHeader(cnpj);
    res.json({ valid: ok, hasCookie: !!ck });
  }catch(e){ next(e); }
});

app.use((err:any,_req:any,res:any,_next:any)=>{
  console.error("[api]", err?.message||err);
  res.status(err?.status||500).json({ error: err?.message||String(err) });
});

async function bootstrap() {
  try { await setupDb(); console.log("[main] Database schema synchronized"); } catch(e:any){ console.warn("[main] DB indisponivel - API sobe sem DB:", e?.message||e); }
  try{ startScheduler(); }catch(e:any){ console.warn("[scheduler] falhou:", e?.message||e); }
  try{ startEngine(); }catch(e:any){ console.warn("[engine] falhou:", e?.message||e); }
  const server = app.listen(config.port, "0.0.0.0", ()=> console.log(`API on http://0.0.0.0:${config.port} db=postgres express`));
  process.on("SIGTERM", async ()=>{ try{ const { closeQueues } = await import("./queue-bull"); await closeQueues(); }catch{} server.close(()=> process.exit(0)); });
}

bootstrap();
