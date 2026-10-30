import { Router } from "express";
import { listCNPJs } from "../store";
import { watchLicitacao, unwatchLicitacao, getLive, enviarLance, lanceLog } from "../live";
async function firstCnpj(): Promise<string|undefined>{ const l=await listCNPJs(); return l[0]?.cnpj; }
const router = Router();
router.get("/:id", async (req,res,next)=>{ try{ const cnpj=String(req.query.cnpj||"").replace(/\D/g,"")||undefined; if(!cnpj) return res.json({ watching:false, itens:[], chat:[], status:"", hora:null, updatedAt:null, error:"cnpj_obrigatorio" }); const q = getLive(String(req.params.id), cnpj); if(!q) return res.json({ watching:false, itens:[], chat:[], status:"", hora:null, updatedAt:null }); res.json({ watching:true, ...q }); }catch(e){ next(e);} });
router.post("/:id/watch", async (req,res,next)=>{ try{ const id=String(req.params.id); const cnpj=String(req.body?.cnpj||req.query.cnpj||"").replace(/\D/g,"")||await firstCnpj(); if(!cnpj) return res.status(400).json({ error:"cnpj obrigatório" }); watchLicitacao(id,cnpj); res.json({ ok:true, watching:id, cnpj }); }catch(e){ next(e);} });
router.post("/:id/unwatch", async (req,res,next)=>{ try{ const cnpj=String(req.body?.cnpj||req.query.cnpj||"").replace(/\D/g,"")||undefined; if(!cnpj) return res.status(400).json({ error:"cnpj obrigatório — sem ele o servidor pararia TODAS as empresas deste pregão" }); unwatchLicitacao(String(req.params.id), cnpj); res.json({ ok:true, cnpj }); }catch(e){ next(e);} });
export default router;
