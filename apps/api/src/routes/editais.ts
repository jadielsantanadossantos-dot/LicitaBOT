import { Router } from "express";
import { buscarEditais, obterEdital, obterLotes } from "@licitabot/portal";
import { listCNPJs } from "../store";
async function firstCnpj(): Promise<string|undefined>{ const l=await listCNPJs(); return l[0]?.cnpj; }
const router = Router();
// Favoritos — antes de /:id para não conflitar
router.get("/favoritos", async (_req, res, next) => {
  try { const { listFavoritos } = await import("../store"); res.json(await listFavoritos()); }
  catch (e) { next(e); }
});
router.post("/favoritos", async (req, res, next) => {
  try {
    const { saveFavorito } = await import("../store");
    const e = req.body;
    if (!e?.id) return res.status(400).json({ error: "id obrigatório" });
    res.json(await saveFavorito(e));
  } catch (e) { next(e); }
});
router.delete("/favoritos/:id", async (req, res, next) => {
  try { const { removeFavorito } = await import("../store"); await removeFavorito(String(req.params.id)); res.json({ ok: true }); }
  catch (e) { next(e); }
});
router.get("/", async (req,res,next)=>{
  try{
    const cnpjQ=String(req.query.cnpj||"")||undefined;
    const dataAbertura=String(req.query.dataAbertura||req.query.data||"")||undefined;
    const dataDe=String(req.query.dataDe||dataAbertura||"")||undefined;
    const dataAte=String(req.query.dataAte||dataAbertura||"")||undefined;
    const r=await buscarEditais({ q:req.query.q as any, numero:req.query.numero as any, cidade:req.query.cidade as any, objeto:req.query.objeto as any, uf:req.query.uf as any, modo:req.query.modo as any, page:Number(req.query.page||1), pageSize:Number(req.query.pageSize||20), dataAbertura: dataAbertura||undefined, dataDe: dataDe||undefined, dataAte: dataAte||undefined } as any, cnpjQ?String(cnpjQ).replace(/\D/g,""):undefined);
    res.json(r);
  }catch(e){ next(e); }
});
router.get("/:id/lotes", async (req,res,next)=>{
  try{
    const id=String(req.params.id);
    const qCnpj=String(req.query.cnpj||"")||await firstCnpj();
    const lotes=await obterLotes(id, qCnpj||undefined);
    res.json(lotes);
  }catch(e){ next(e); }
});
router.get("/:id/arquivos", async (req,res,next)=>{
  try{
    const id=String(req.params.id);
    const cnpj=String(req.query.cnpj||"")||await firstCnpj()||"";
    if(!id||!cnpj) return res.status(400).json({ error:"id e cnpj obrigatórios" });
    const { fetchWithJar } = await import("@licitabot/portal");
    const BASE_OP="https://operacao.portaldecompraspublicas.com.br";
    const r=await fetchWithJar(cnpj, `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}`, { headers:{ Accept:"text/html" } } as any);
    const buf=await r.arrayBuffer(); const ct=r.headers.get("content-type")||"";
    const html=ct.includes("iso-8859")?new TextDecoder("iso-8859-1").decode(buf):new TextDecoder("utf-8").decode(buf).includes("�")?new TextDecoder("iso-8859-1").decode(buf):new TextDecoder("utf-8").decode(buf);
    const links=[...html.matchAll(/href="([^"]*\/4\/Pregoes\/Download[^"]*)"/gi)].map(x=> `${BASE_OP}${x[1].replace(/&amp;/g,"&")}`);
    const uniq=[...new Set(links)];
    res.json({ id, arquivos: uniq.map(href=> ({ href, label:"Download edital" })), portalUrl:`${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}` });
  }catch(e){ next(e); }
});
router.get("/:id", async (req,res,next)=>{
  try{
    const e=await obterEdital(String(req.params.id));
    if(!e) return res.status(404).json({ error:"Edital não encontrado" });
    res.json(e);
  }catch(err){ next(err); }
});
export default router;
