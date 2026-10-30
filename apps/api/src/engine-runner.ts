import { decidirLance, calcularDelayHumano, calcularReacaoHumana } from "@licitabot/engine";
import { listDisputas } from "./store";
import { liveState, liveKey, isLanceCooldown } from "./live";
import { fetchRanking, parsePosicaoNumero } from "@licitabot/portal";
import { enqueueLance } from "./queue-bull";
import { getEstadoEstrategia, adicionarAlerta } from "./main";

export async function setAuto(disputaId: string, on: boolean){
  const { setDisputaAuto } = await import("./store");
  await setDisputaAuto(disputaId, on);
}
export async function isAuto(disputaId: string){
  const { getDisputaAuto } = await import("./store");
  return getDisputaAuto(disputaId);
}

let timer: NodeJS.Timeout | null = null;
let tickEmVoo = false;
const priceHistory = new Map<string, { valor: number; ts: number }>();

const nextLanceAt = new Map<string, number>();
const menorVisto = new Map<string, { valor: number; vistoEm: number; reagirAte: number }>();
const ultimoEnvio = new Map<string, number>();
const REGRA_20S_MS = 20_400;

export function startEngine(){
  if(timer) return;
  timer = setInterval(()=>{ tick().catch(()=>{}); }, 1100);
}

async function tick(){
  if(tickEmVoo) return;
  tickEmVoo = true;
  try {
    const { listAutos } = await import("./store");
    const autos = await listAutos().catch(()=> new Map<string,boolean>());
    for(const d of await listDisputas()){
      if(d.status !== "em_andamento") continue;
      const auto = autos.get(d.id) ?? false;
      if(!auto) continue;
      
      const config = getEstadoEstrategia(d.cnpj);
      if (!config.ativo) continue;

      const licitacaoId = d.processoId;
      const live = liveState.get(liveKey(licitacaoId, d.cnpj)) ?? liveState.get(licitacaoId) ?? null;
      if(!live || !live.itens.length) continue;
      const hora = live.hora ? new Date(live.hora) : new Date();
      
      for(const item of d.itens){
        if(!item.ativo) continue;
        const norm = (s:string)=> String(s).replace(/^0+/,"") || "0";
        const sessItem = live.itens.find(x=> x.id === item.loteId || norm(x.numero) === norm(item.loteId) || norm(x.id) === norm(item.loteId) || x.id === item.id);
        if(!sessItem || !sessItem.temFormLance) continue;
        
        const menor = sessItem.melhorLance ?? null;
        const fase = sessItem.situacao?.toLowerCase().includes("suspens") ? "SUSPENSA" : "ABERTA";
        const tempoMs = (()=>{ const t=sessItem.tempo ?? ""; const m=t.match(/(\d+):(\d+):(\d+)/) ?? t.match(/(\d+):(\d+)/); if(!m) return null; if(m.length===4) return (Number(m[1])*3600+Number(m[2])*60+Number(m[3]))*1000; return (Number(m[1])*60+Number(m[2]))*1000; })();
        
        const alvo = Number(config.alvo) || 1;
        const decremento = Number(config.decremento) || 0.01;
        const tempoDif = Number(config.tempoDif) * 1000 || 0; // Nova config em segundos
        
        const histKey = `${d.id}:${item.loteId}`;
        const agora = Date.now();
        const last = ultimoEnvio.get(histKey) ?? 0;
        
        if (agora - last < tempoDif) continue;

        let rankingValores: number[] = [];
        try {
          const rk = await fetchRanking(d.cnpj, licitacaoId, sessItem.id, { maxAgeMs: 1200 } as any);
          rankingValores = rk.posicoes.map(p=> p.valor).sort((a,b)=> a-b);
        } catch {}

        const estado = { loteId: item.loteId, menorLance: menor, meuLance: (sessItem as any).meuLance ?? null, tempoRestanteMs: tempoMs, fase } as any;
        let valor = decidirLance(item as any, estado, hora.getTime());
        
        if (valor == null) continue;

        // --- REMOVIDA A TRAVA DE EXEQUIBILIDADE ---
        // Apenas informamos se está abaixo
        const exeqPercent = Number(config.exeq ?? 50);
        const ref = (sessItem as any).referencia ?? null;
        const precoMin = Number(config.precoMinimo ?? 0);
        
        if (ref && valor < (ref * (exeqPercent / 100))) {
           adicionarAlerta(d.cnpj, `⚠️ Lance R$ ${valor} abaixo da exequibilidade!`);
        }
        
        // Mantemos apenas a trava absoluta de Preço Mínimo (se configurada)
        valor = Math.max(valor, precoMin);

        if (alvo === 1 && menor != null && valor >= menor - 1e-9) continue;
        if (isLanceCooldown(d.cnpj, sessItem.id)) continue;

        await enqueueLance({ licitacaoId, cnpj: d.cnpj, loteId: item.loteId, sessItemId: sessItem.id, valor, disputaId: d.id });
        ultimoEnvio.set(histKey, agora);
        console.log(`[engine] Disparado: ${valor} para ${d.cnpj} item ${item.loteId}`);
      }
    }
  } finally { tickEmVoo = false; }
}