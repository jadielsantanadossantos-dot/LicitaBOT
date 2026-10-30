import { Controller, Get, Param, Query } from "@nestjs/common";
import { buscarEditais, obterEdital, obterLotes } from "@licitabot/portal";
import { listCNPJs } from "../store";
@Controller("api/editais")
export class EditaisController {
  @Get() async list(@Query() q:any){
    const cnpjQ = q.cnpj||undefined;
    return buscarEditais({ q:q.q, numero:q.numero, cidade:q.cidade, objeto:q.objeto, uf:q.uf, modo:q.modo, page:Number(q.page||1), pageSize:Number(q.pageSize||20), dataAbertura:q.dataAbertura||q.data, dataDe:q.dataDe||q.dataAbertura, dataAte:q.dataAte||q.dataAbertura } as any, cnpjQ?String(cnpjQ).replace(/\D/g,""):undefined);
  }
  @Get(":id/lotes") async lotes(@Param("id") id:string, @Query() q:any){
    const qc = q.cnpj|| (await listCNPJs())[0]?.cnpj;
    return obterLotes(id, qc||undefined);
  }
  @Get(":id/arquivos") async arquivos(@Param("id") id:string, @Query() q:any){
    const cnpj = q.cnpj|| (await listCNPJs())[0]?.cnpj||"";
    const { fetchWithJar } = await import("@licitabot/portal");
    const BASE_OP="https://operacao.portaldecompraspublicas.com.br";
    const r=await fetchWithJar(cnpj, `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}`, { headers:{ Accept:"text/html" }} as any);
    const buf=await r.arrayBuffer(); const ct=r.headers.get("content-type")||"";
    const html=ct.includes("iso-8859")?new TextDecoder("iso-8859-1").decode(buf):new TextDecoder("utf-8").decode(buf).includes("�")?new TextDecoder("iso-8859-1").decode(buf):new TextDecoder("utf-8").decode(buf);
    const links=[...html.matchAll(/href="([^"]*\/4\/Pregoes\/Download[^"]*)"/gi)].map(x=> `${BASE_OP}${x[1].replace(/&amp;/g,"&")}`);
    return { id, arquivos:[...new Set(links)].map(href=>({href,label:"Download edital"})), portalUrl:`${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}` };
  }
  @Get(":id") async one(@Param("id") id:string){
    const e=await obterEdital(id); if(!e) throw Object.assign(new Error("Edital não encontrado"),{status:404}); return e;
  }
}
