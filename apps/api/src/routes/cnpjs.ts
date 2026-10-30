import { Router } from "express";
import { z } from "zod";
import { validarCNPJ } from "@licitabot/shared";
import { listCNPJs, upsertCNPJ, patchCNPJ, removeCNPJ } from "../store";
import { isSessionValid, getCookiesHeader, clearStorage } from "@licitabot/portal";

const router = Router();
router.get("/", async (_req, res, next)=>{ try{ res.json(await listCNPJs()); }catch(e){ next(e);} });
router.post("/", async (req, res, next)=>{
  try{
    const s=z.object({ cnpj:z.string(), apelido:z.string().optional(), razaoSocial:z.string().optional(), portalUser:z.string().optional(), portalPass:z.string().optional() });
    const body=s.parse(req.body);
    const cnpj=String(body.cnpj).replace(/\D/g,"");
    if(!validarCNPJ(cnpj)) return res.status(400).json({ error:"CNPJ inválido (14 dígitos)" });
    const conta=await upsertCNPJ({ cnpj, apelido: body.apelido, razaoSocial: body.razaoSocial, portalUser: body.portalUser, portalPass: body.portalPass, createdAt: new Date().toISOString() } as any);
    res.status(201).json(conta);
  }catch(e){ next(e); }
});
router.post("/:cnpj/login", async (req, res, next)=>{
  try{
    const cnpj=String(req.params.cnpj).replace(/\D/g,"");
    if(req.body?.portalUser || req.body?.portalPass) await patchCNPJ(cnpj, { portalUser: req.body.portalUser, portalPass: req.body.portalPass } as any);
    const { loginWithCredentials, getCookiesHeader: getCk, isSessionValid: isValid } = await import("@licitabot/portal");
    const alreadyValid = await isValid(cnpj).catch(()=> false);
    const okRaw = await loginWithCredentials(cnpj, req.body?.portalUser, req.body?.portalPass);
    const hasCk=!!(await getCk(cnpj));
    const stillValid = hasCk ? await isValid(cnpj).catch(()=> false) : false;
    const ok = okRaw || alreadyValid || stillValid;
    res.status(ok?200:400).json({ ok, hasCookie: hasCk, cnpj, alreadyValid, stillValid });
  }catch(e){ next(e); }
});
router.get("/:cnpj/valid", async (req,res,next)=>{
  try{
    const cnpj=String(req.params.cnpj).replace(/\D/g,"");
    const ok=await isSessionValid(cnpj);
    const ck=await getCookiesHeader(cnpj);
    res.json({ valid: ok, hasCookie: !!ck, cnpj });
  }catch(e){ next(e); }
});
router.patch("/:cnpj", async (req,res,next)=>{
  try{
    const cnpj=String(req.params.cnpj).replace(/\D/g,"");
    const patch:any={};
    if(req.body.apelido!==undefined) patch.apelido=req.body.apelido;
    if(req.body.razaoSocial!==undefined) patch.razaoSocial=req.body.razaoSocial;
    if(req.body.portalUser!==undefined) patch.portalUser=req.body.portalUser;
    if(req.body.portalPass!==undefined) patch.portalPass=req.body.portalPass;
    const updated=await patchCNPJ(cnpj, patch);
    if(!updated) return res.status(404).json({ error:"CNPJ não encontrado" });
    res.json(updated);
  }catch(e){ next(e); }
});
router.delete("/:cnpj", async (req,res,next)=>{
  try{ await removeCNPJ(String(req.params.cnpj).replace(/\D/g,"")); res.json({ ok:true }); }catch(e){ next(e); }
});
router.delete("/:cnpj/session", async (req,res,next)=>{
  try {
    const cnpj = String(req.params.cnpj).replace(/\D/g, "");
    await clearStorage(cnpj);
    res.json({ ok: true, message: "Sessão limpa com sucesso. A próxima abertura forçará o login." });
  } catch(e) { next(e); }
});
export default router;
