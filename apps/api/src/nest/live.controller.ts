import { Controller, Get, Post, Param, Body, Query } from "@nestjs/common";
import { listCNPJs } from "../store";
import { getLive, watchLicitacao, unwatchLicitacao, enviarLance, lanceLog } from "../live";
import { obterHtmlAba, parseItens, obterHoraServidor, obterChat, obterStatus, isSessionValid, getCookiesHeader } from "@licitabot/portal";
import { buscarEditais } from "@licitabot/portal";
import { agendaSnapshot } from "../scheduler";
@Controller()
export class LiveExtraController {
  @Get("api/live/:id") live(@Param("id") id:string){ const q=getLive(id); return q?{watching:true,...q}:{watching:false,itens:[],chat:[],status:"",hora:null,updatedAt:null}; }
  @Post("api/live/:id/watch") async watch(@Param("id") id:string, @Body() b:any, @Query() q:any){ const cnpj=String(b?.cnpj||q.cnpj||"").replace(/\D/g,"")|| (await listCNPJs())[0]?.cnpj||""; if(!cnpj) throw Object.assign(new Error("cnpj obrigatório"),{status:400}); watchLicitacao(id,cnpj); return {ok:true,watching:id,cnpj}; }
  @Post("api/live/:id/unwatch") unwatch(@Param("id") id:string){ unwatchLicitacao(id); return {ok:true}; }
  @Post("api/lance") async lance(@Body() b:any){ const licitacaoId=String(b.licitacaoId||b.processoId||""); const itemId=String(b.itemId||b.loteId||""); const valor=Number(b.valor); const cnpj=String(b.cnpj||"").replace(/\D/g,""); if(!licitacaoId||!itemId||!valor||!cnpj) throw Object.assign(new Error("licitacaoId,itemId,valor,cnpj obrigatórios"),{status:400}); const r=await enviarLance(licitacaoId,cnpj,itemId,valor); return r; }
  @Get("api/lances/log") log(){ return lanceLog.slice(0,50); }
  @Get("api/agenda") agenda(){ return agendaSnapshot(); }
  @Get("api/hora") async hora(@Query() q:any){ const cnpj=String(q.cnpj||"")|| (await listCNPJs())[0]?.cnpj||undefined; const h=cnpj?await obterHoraServidor(cnpj):await obterHoraServidor(); return {hora:h?h.toISOString():null,local:new Date().toISOString()}; }
  @Get("api/sessao") async sessao(@Query() q:any){ const id=String(q.id||""); const cnpj=String(q.cnpj||"")|| (await listCNPJs())[0]?.cnpj||""; if(!id||!cnpj) throw Object.assign(new Error("id e cnpj obrigatórios"),{status:400}); const html=await obterHtmlAba(cnpj,id,0,1,1); return {itens:parseItens(html),htmlLen:html.length}; }
  @Get("api/sessao/valid") async valid(@Query() q:any){ const cnpj=String(q.cnpj||"")|| (await listCNPJs())[0]?.cnpj||""; if(!cnpj) throw Object.assign(new Error("cnpj obrigatório"),{status:400}); return {valid:await isSessionValid(cnpj),hasCookie:!!(await getCookiesHeader(cnpj))}; }
  @Get("api/ranking/:licitacaoId/:itemId") async ranking(@Param("licitacaoId") lic:string, @Param("itemId") item:string, @Query() q:any){ const cnpj=String(q.cnpj||"")|| (await listCNPJs())[0]?.cnpj||""; if(!lic||!item||!cnpj) throw Object.assign(new Error("licitacaoId,itemId,cnpj obrigatórios"),{status:400}); const {fetchRanking}=await import("@licitabot/portal"); return fetchRanking(cnpj,lic,item); }
  @Get("api/pregoes") async pregoes(@Query() q:any){ const cnpj=String(q.cnpj||"")|| (await listCNPJs())[0]?.cnpj||""; if(!cnpj) throw Object.assign(new Error("nenhum CNPJ"),{status:400}); return buscarEditais({q:q.q as any,uf:q.uf as any,page:Number(q.pagina||1),pageSize:50,dataDe:q.dataAbertura||q.dataDe as any,dataAte:q.dataAbertura||q.dataDe as any} as any,cnpj); }
}
