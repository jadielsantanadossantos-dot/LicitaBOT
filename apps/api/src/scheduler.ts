import { listDisputas, saveDisputa, listCNPJs } from "./store";
import { watchLicitacao, ensureSession } from "./live";

let timer: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (timer) return;
  timer = setInterval(() => { tick().catch(()=>{}); }, 30000);
  tick().catch(()=>{});
}

async function tick() {
  const now = Date.now();

  // --- SENTINELA DE SESSÃO PROATIVA ---
  const cnpjs = await listCNPJs();
  await Promise.all(cnpjs.map(async (c) => {
    try {
      const ok = await ensureSession(c.cnpj);
      if (!ok) console.log(`[sentinel] falha ao garantir sessão para ${c.cnpj}`);
    } catch(e) { console.error(`[sentinel] erro no check de ${c.cnpj}`, e); }
  }));

  for (const d of await listDisputas()) {

    if (d.status !== "agendada") continue;
    const when = new Date(d.dataHora).getTime();
    const inWindow = when - now <= 15 * 60 * 1000 && when > now - 60 * 60 * 1000;
    if (inWindow) {
      console.log(`[agenda] disputa ${d.id} (${d.processoId}) em ${d.dataHora} — janela de abertura → watch`);
      try{ watchLicitacao(d.processoId, d.cnpj); }catch{}
    }
    if (when <= now && d.status === "agendada") {
      d.status = "em_andamento";
      await saveDisputa({ ...d, updatedAt: new Date().toISOString() });
      console.log(`[agenda] disputa ${d.id} movida para em_andamento`);
      try{ watchLicitacao(d.processoId, d.cnpj); }catch{}
    }
  }
}

export async function agendaSnapshot() {
  const now = Date.now();
  return (await listDisputas())
    .filter((d) => d.status === "agendada" || d.status === "em_andamento")
    .map((d) => ({ id: d.id, processoId: d.processoId, cnpj: d.cnpj, dataHora: d.dataHora, status: d.status, msAte: new Date(d.dataHora).getTime() - now, itens: d.itens.length, exequibilidade: (d as any).exequibilidade ?? 50 }))
    .sort((a, b) => a.msAte - b.msAte);
}
