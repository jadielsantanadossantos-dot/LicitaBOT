import { Router } from "express";
import { z } from "zod";
import { validarDisputa, validarCNPJ } from "@licitabot/shared";
import type { DisputaConfig } from "@licitabot/shared";
import { listDisputas, getDisputa, saveDisputa, deleteDisputa, panic } from "../store";
import { setDisputaAuto, getDisputaAuto } from "../store";

const router = Router();
router.get("/:id/auto", async (req,res,next)=>{ try{ res.json({ id: String(req.params.id), auto: await getDisputaAuto(String(req.params.id)) }); }catch(e){ next(e);} });
router.post("/:id/auto", async (req,res,next)=>{ try{ const id=String(req.params.id); const on=!!req.body?.on; await setDisputaAuto(id, on); res.json({ id, auto: on }); }catch(e){ next(e);} });
router.patch("/:id/itens/:loteId", async (req,res,next)=>{
  try{
    const disputaId=String(req.params.id); const loteId=String(req.params.loteId);
    const disputa=await getDisputa(disputaId);
    if(!disputa) return res.status(404).json({ error:"Disputa não encontrada" });
    const norm = (s:any)=> { const t = String(s ?? "").trim(); const n = t.replace(/^0+/,""); return n === "" ? "0" : n; };
    const idx=disputa.itens.findIndex((x:any)=> x.loteId===loteId || x.id===loteId || norm((x as any).loteId)===norm(loteId));
    if(idx<0) return res.status(404).json({ error:"Item não encontrado (loteId)" });
    if(req.body?.posicaoAlvo !== undefined){
      const pa=Number(req.body?.posicaoAlvo);
      if(!Number.isInteger(pa) || pa<1 || pa>10) return res.status(400).json({ error:"posicaoAlvo deve ser 1..10" });
      (disputa.itens[idx] as any).posicaoAlvo=pa;
    }
    if(req.body?.ativo !== undefined){
      (disputa.itens[idx] as any).ativo=!!req.body.ativo;
    }
    if(req.body?.decremento !== undefined){
      const dec=Number(String(req.body.decremento).replace(",","."));
      if(!Number.isFinite(dec) || dec<=0) return res.status(400).json({ error:"decremento deve ser >0" });
      (disputa.itens[idx] as any).decremento=dec;
    }
    if(req.body?.estrategia !== undefined){
      const est=String(req.body.estrategia);
      if(!["cobrir_minimo","agressivo","conservador","sniper"].includes(est)) return res.status(400).json({ error:"estrategia inválida" });
      (disputa.itens[idx] as any).estrategia=est;
    }
    if(req.body?.posicaoAlvo === undefined && req.body?.ativo === undefined && req.body?.decremento === undefined && req.body?.estrategia === undefined) return res.status(400).json({ error:"informe posicaoAlvo (1..10), ativo, decremento e/ou estrategia" });
    disputa.updatedAt=new Date().toISOString();
    const errs=validarDisputa(disputa);
    if(errs.length) return res.status(400).json({ error: errs });
    await saveDisputa(disputa);
    res.json(disputa);
  }catch(e){ next(e); }
});
router.get("/", async (_req,res,next)=>{ try{ res.json(await listDisputas()); }catch(e){ next(e);} });
router.post("/", async (req,res,next)=>{
  try{
    const now=new Date().toISOString();
    const d: DisputaConfig={ id: req.body.id || `disp-${Date.now()}`, processoId: req.body.processoId, editalId: req.body.editalId, cnpj: String(req.body.cnpj||"").replace(/\D/g,""), modo: req.body.modo, dataHora: req.body.dataHora, status: req.body.status||"rascunho", exequibilidade: req.body.exequibilidade != null ? Number(String(req.body.exequibilidade).replace(",",".")) : 50, itens: req.body.itens||[], createdAt: now, updatedAt: now };
    const errs=validarDisputa(d);
    if(errs.length) return res.status(400).json({ error: errs });
    if(!validarCNPJ(d.cnpj)) return res.status(400).json({ error:"CNPJ inválido" });
    // Trava anti-duplicata: mesmo pregão + mesmo CNPJ ativo não pode repetir
    const existentes = await listDisputas();
    const dup = existentes.find((x:any)=> String(x.processoId)===String(d.processoId) && String(x.cnpj).replace(/\D/g,"")===d.cnpj && (x.status==="agendada"||x.status==="em_andamento"));
    if(dup) return res.status(409).json({ error:`Já existe disputa ${dup.id} para o pregão ${d.processoId} com o CNPJ ${d.cnpj}. Para 2 empresas, troque o CNPJ. Exclua a duplicata antes de recriar.` });
    await saveDisputa(d);
    res.status(201).json(d);
  }catch(e){ next(e); }
});
router.get("/:id", async (req,res,next)=>{ try{ const d=await getDisputa(String(req.params.id)); if(!d) return res.status(404).json({ error:"Disputa não encontrada" }); res.json(d);}catch(e){next(e);} });
router.put("/:id", async (req,res,next)=>{
  try{
    const id=String(req.params.id);
    const existing=await getDisputa(id);
    if(!existing) return res.status(404).json({ error:"Disputa não encontrada" });
    const updated: DisputaConfig={ ...existing, ...req.body, id, updatedAt: new Date().toISOString() };
    const errs=validarDisputa(updated);
    if(errs.length) return res.status(400).json({ error: errs });
    await saveDisputa(updated);
    res.json(updated);
  }catch(e){ next(e); }
});
router.delete("/:id", async (req,res,next)=>{ try{ await deleteDisputa(String(req.params.id)); res.json({ ok:true }); }catch(e){ next(e);} });
router.post("/panic", async (req,res,next)=>{
  try {
    const { purgeAllQueues } = await import("../queue-bull");
    const result = await panic();
    await purgeAllQueues();
    res.json(result);
  } catch(e) { next(e); }
});
export default router;
