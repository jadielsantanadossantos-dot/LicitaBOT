import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { z } from "zod";
import { validarCNPJ } from "@licitabot/shared";
import { listCNPJs, upsertCNPJ, patchCNPJ, removeCNPJ } from "../store";
import { isSessionValid, getCookiesHeader } from "@licitabot/portal";
@Controller("api/cnpjs")
export class CnpjsController {
  @Get() list(){ return listCNPJs(); }
  @Post() async create(@Body() body:any){
    const s=z.object({ cnpj:z.string(), apelido:z.string().optional(), razaoSocial:z.string().optional(), portalUser:z.string().optional(), portalPass:z.string().optional() });
    const b=s.parse(body);
    const cnpj=String(b.cnpj).replace(/\D/g,"");
    if(!validarCNPJ(cnpj)) throw Object.assign(new Error("CNPJ inválido"),{status:400});
    return upsertCNPJ({ cnpj, apelido:b.apelido, razaoSocial:b.razaoSocial, portalUser:b.portalUser, portalPass:b.portalPass, createdAt:new Date().toISOString()} as any);
  }
  @Post(":cnpj/login") async login(@Param("cnpj") cnpj:string, @Body() body:any){
    const id=String(cnpj).replace(/\D/g,"");
    const { loginWithCredentials, getCookiesHeader:getCk } = await import("@licitabot/portal");
    const ok=await loginWithCredentials(id, body?.portalUser, body?.portalPass);
    if(body?.portalUser||body?.portalPass) await patchCNPJ(id, { portalUser: body.portalUser, portalPass: body.portalPass} as any);
    return { ok, hasCookie: !!(await getCk(id)), cnpj:id };
  }
  @Get(":cnpj/valid") async valid(@Param("cnpj") cnpj:string){
    const id=String(cnpj).replace(/\D/g,"");
    return { valid: await isSessionValid(id), hasCookie: !!(await getCookiesHeader(id)), cnpj:id };
  }
  @Patch(":cnpj") async patch(@Param("cnpj") cnpj:string, @Body() body:any){
    const id=String(cnpj).replace(/\D/g,"");
    const patch:any={};
    if(body.apelido!==undefined) patch.apelido=body.apelido;
    if(body.razaoSocial!==undefined) patch.razaoSocial=body.razaoSocial;
    if(body.portalUser!==undefined) patch.portalUser=body.portalUser;
    if(body.portalPass!==undefined) patch.portalPass=body.portalPass;
    const u=await patchCNPJ(id,patch);
    if(!u) throw Object.assign(new Error("CNPJ não encontrado"),{status:404});
    return u;
  }
  @Delete(":cnpj") async del(@Param("cnpj") cnpj:string){ await removeCNPJ(String(cnpj).replace(/\D/g,"")); return { ok:true }; }
}
