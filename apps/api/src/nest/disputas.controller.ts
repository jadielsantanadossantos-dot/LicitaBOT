import { Controller, Get, Post, Put, Patch, Delete, Param, Body } from "@nestjs/common";
import { validarDisputa, validarCNPJ } from "@licitabot/shared";
import { listDisputas, getDisputa, saveDisputa, deleteDisputa, setDisputaAuto, getDisputaAuto } from "../store";
@Controller("api/disputas")
export class DisputasController {
  @Get(":id/auto") getAuto(@Param("id") id:string){ return getDisputaAuto(id).then(auto=>({id,auto})); }
  @Post(":id/auto") async setAuto(@Param("id") id:string, @Body() b:any){ await setDisputaAuto(id, !!b?.on); return { id, auto: !!b?.on }; }
  @Patch(":id/itens/:loteId") async patchItem(@Param("id") id:string, @Param("loteId") loteId:string, @Body() b:any){
    const d=await getDisputa(id); if(!d) throw Object.assign(new Error("Disputa não encontrada"),{status:404});
    const norm=(s:any)=>{ const t=String(s??"").trim(); const n=t.replace(/^0+/,""); return n===""?"0":n; };
    const idx=d.itens.findIndex((x:any)=> x.loteId===loteId||x.id===loteId||norm((x as any).loteId)===norm(loteId));
    if(idx<0) throw Object.assign(new Error("Item não encontrado"),{status:404});
    let touched=false;
    if(b?.posicaoAlvo!==undefined){
      const pa=Number(b?.posicaoAlvo);
      if(!Number.isInteger(pa)||pa<1||pa>10) throw Object.assign(new Error("posicaoAlvo 1..10"),{status:400});
      (d.itens[idx] as any).posicaoAlvo=pa; touched=true;
    }
    if(b?.ativo!==undefined){ (d.itens[idx] as any).ativo=!!b.ativo; touched=true; }
    if(b?.decremento!==undefined){
      const dec=Number(String(b.decremento).replace(",","."));
      if(!Number.isFinite(dec)||dec<=0) throw Object.assign(new Error("decremento deve ser >0"),{status:400});
      (d.itens[idx] as any).decremento=dec; touched=true;
    }
    if(b?.estrategia!==undefined){
      const est=String(b.estrategia);
      if(!["cobrir_minimo","agressivo","conservador","sniper"].includes(est)) throw Object.assign(new Error("estrategia inválida"),{status:400});
      (d.itens[idx] as any).estrategia=est; touched=true;
    }
    if(!touched) throw Object.assign(new Error("informe posicaoAlvo, ativo, decremento e/ou estrategia"),{status:400});
    d.updatedAt=new Date().toISOString();
    const errs=validarDisputa(d); if(errs.length) throw Object.assign(new Error(JSON.stringify(errs)),{status:400});
    await saveDisputa(d); return d;
  }
  @Get() list(){ return listDisputas(); }
  @Post() async create(@Body() b:any){
    const now=new Date().toISOString();
    const d:any={ id:b.id||`disp-${Date.now()}`, processoId:b.processoId, editalId:b.editalId, cnpj:String(b.cnpj||"").replace(/\D/g,""), modo:b.modo, dataHora:b.dataHora, status:b.status||"rascunho", itens:b.itens||[], createdAt:now, updatedAt:now };
    const errs=validarDisputa(d); if(errs.length) throw Object.assign(new Error(JSON.stringify(errs)),{status:400});
    if(!validarCNPJ(d.cnpj)) throw Object.assign(new Error("CNPJ inválido"),{status:400});
    await saveDisputa(d); return d;
  }
  @Get(":id") async one(@Param("id") id:string){ const d=await getDisputa(id); if(!d) throw Object.assign(new Error("Disputa não encontrada"),{status:404}); return d; }
  @Put(":id") async upd(@Param("id") id:string, @Body() b:any){
    const ex=await getDisputa(id); if(!ex) throw Object.assign(new Error("Disputa não encontrada"),{status:404});
    const up:any={ ...ex, ...b, id, updatedAt:new Date().toISOString() };
    const errs=validarDisputa(up); if(errs.length) throw Object.assign(new Error(JSON.stringify(errs)),{status:400});
    await saveDisputa(up); return up;
  }
  @Delete(":id") async del(@Param("id") id:string){ await deleteDisputa(id); return { ok:true }; }
}
