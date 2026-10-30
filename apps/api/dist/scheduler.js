"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
exports.agendaSnapshot = agendaSnapshot;
const store_1 = require("./store");
const live_1 = require("./live");
let timer = null;
function startScheduler() {
    if (timer)
        return;
    timer = setInterval(() => { tick().catch(() => { }); }, 30000);
    tick().catch(() => { });
}
async function tick() {
    const now = Date.now();
    // --- SENTINELA DE SESSÃO PROATIVA ---
    const cnpjs = await (0, store_1.listCNPJs)();
    await Promise.all(cnpjs.map(async (c) => {
        try {
            const ok = await (0, live_1.ensureSession)(c.cnpj);
            if (!ok)
                console.log(`[sentinel] falha ao garantir sessão para ${c.cnpj}`);
        }
        catch (e) {
            console.error(`[sentinel] erro no check de ${c.cnpj}`, e);
        }
    }));
    for (const d of await (0, store_1.listDisputas)()) {
        if (d.status !== "agendada")
            continue;
        const when = new Date(d.dataHora).getTime();
        const inWindow = when - now <= 15 * 60 * 1000 && when > now - 60 * 60 * 1000;
        if (inWindow) {
            console.log(`[agenda] disputa ${d.id} (${d.processoId}) em ${d.dataHora} — janela de abertura → watch`);
            try {
                (0, live_1.watchLicitacao)(d.processoId, d.cnpj);
            }
            catch { }
        }
        if (when <= now && d.status === "agendada") {
            d.status = "em_andamento";
            await (0, store_1.saveDisputa)({ ...d, updatedAt: new Date().toISOString() });
            console.log(`[agenda] disputa ${d.id} movida para em_andamento`);
            try {
                (0, live_1.watchLicitacao)(d.processoId, d.cnpj);
            }
            catch { }
        }
    }
}
async function agendaSnapshot() {
    const now = Date.now();
    return (await (0, store_1.listDisputas)())
        .filter((d) => d.status === "agendada" || d.status === "em_andamento")
        .map((d) => ({ id: d.id, processoId: d.processoId, cnpj: d.cnpj, dataHora: d.dataHora, status: d.status, msAte: new Date(d.dataHora).getTime() - now, itens: d.itens.length, exequibilidade: d.exequibilidade ?? 50 }))
        .sort((a, b) => a.msAte - b.msAte);
}
//# sourceMappingURL=scheduler.js.map