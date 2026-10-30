"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAuto = setAuto;
exports.isAuto = isAuto;
exports.startEngine = startEngine;
const engine_1 = require("@licitabot/engine");
const store_1 = require("./store");
const live_1 = require("./live");
const portal_1 = require("@licitabot/portal");
const queue_bull_1 = require("./queue-bull");
async function setAuto(disputaId, on) {
    const { setDisputaAuto } = await Promise.resolve().then(() => __importStar(require("./store")));
    await setDisputaAuto(disputaId, on);
}
async function isAuto(disputaId) {
    const { getDisputaAuto } = await Promise.resolve().then(() => __importStar(require("./store")));
    return getDisputaAuto(disputaId);
}
let timer = null;
let tickEmVoo = false;
const priceHistory = new Map();
// --- TIMING HUMANO ---
// nextLanceAt: próximo instante em que o item PODE dar lance (delay aleatório por tempo do item).
// menorVisto: quando o menor preço atual apareceu pela 1ª vez + até quando "estamos lendo" (reação humana).
// ultimoEnvio: último envio NOSSO por item — respeita a regra do portal "20s entre seus lances".
const nextLanceAt = new Map();
const menorVisto = new Map();
const ultimoEnvio = new Map();
const REGRA_20S_MS = 20_400;
function startEngine() {
    if (timer)
        return;
    timer = setInterval(() => { tick().catch(() => { }); }, 1100);
}
async function tick() {
    if (tickEmVoo)
        return; // tick anterior ainda varrendo 127 itens + rankings — não empilha
    tickEmVoo = true;
    try {
        const { listAutos } = await Promise.resolve().then(() => __importStar(require("./store")));
        const autos = await listAutos().catch(() => new Map());
        for (const d of await (0, store_1.listDisputas)()) {
            if (d.status !== "em_andamento")
                continue;
            const auto = autos.get(d.id) ?? false;
            if (!auto)
                continue;
            const licitacaoId = d.processoId;
            const live = live_1.liveState.get((0, live_1.liveKey)(licitacaoId, d.cnpj)) ?? live_1.liveState.get(licitacaoId) ?? null;
            if (!live || !live.itens.length)
                continue;
            const hora = live.hora ? new Date(live.hora) : new Date();
            for (const item of d.itens) {
                if (!item.ativo)
                    continue;
                const norm = (s) => String(s).replace(/^0+/, "") || "0";
                const sessItem = live.itens.find(x => x.id === item.loteId || norm(x.numero) === norm(item.loteId) || norm(x.id) === norm(item.loteId) || x.id === item.id);
                if (!sessItem)
                    continue;
                if (!sessItem.temFormLance)
                    continue;
                const menor = sessItem.melhorLance ?? null;
                const fase = sessItem.situacao?.toLowerCase().includes("suspens") ? "SUSPENSA" : sessItem.temFormLance ? "ABERTA" : "ENCERRADA";
                const tempoMs = (() => { const t = sessItem.tempo ?? ""; const m = t.match(/(\d+):(\d+):(\d+)/) ?? t.match(/(\d+):(\d+)/); if (!m)
                    return null; if (m.length === 4)
                    return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000; return (Number(m[1]) * 60 + Number(m[2])) * 1000; })();
                const posicao = sessItem.posicao ?? (0, portal_1.parsePosicaoNumero)(sessItem.posicaoRaw) ?? (sessItem.estaVencendo ? 1 : null);
                const alvo = item.posicaoAlvo ?? 1;
                const posRawLower = String(sessItem.posicaoRaw ?? "").toLowerCase();
                const precisaDesempate = alvo === 1 && (posRawLower.includes("empat") || sessItem.estaVencendo === false
                    || sessItem.autorMelhor === "concorrente"
                    || (sessItem.meuLance != null && menor != null && sessItem.meuLance !== menor));
                // --- DETECÇÃO DE GUERRA DE LANCES ---
                const histKey = `${d.id}:${item.loteId}`;
                const prev = priceHistory.get(histKey);
                let isWar = false;
                if (menor != null && prev && prev.valor > menor && (Date.now() - prev.ts < 5000)) {
                    isWar = true; // Preço caiu nos últimos 5 segundos
                }
                if (menor != null)
                    priceHistory.set(histKey, { valor: menor, ts: Date.now() });
                if (precisaDesempate)
                    isWar = true;
                const last = ultimoEnvio.get(histKey) ?? 0;
                const agora = Date.now();
                if (precisaDesempate) {
                    if (last && agora - last < 3200)
                        continue;
                }
                else {
                    const agendado = nextLanceAt.get(histKey) ?? 0;
                    if (agora < agendado)
                        continue;
                    if (menor != null) {
                        const visto = menorVisto.get(histKey);
                        if (!visto || visto.valor !== menor) {
                            const reagirAte = agora + (0, engine_1.calcularReacaoHumana)(tempoMs);
                            menorVisto.set(histKey, { valor: menor, vistoEm: agora, reagirAte });
                            if (!visto || visto.valor !== menor) {
                                if (menorVisto.size > 5000) {
                                    const c = Date.now();
                                    for (const [k, v] of menorVisto)
                                        if (c - v.vistoEm > 600_000)
                                            menorVisto.delete(k);
                                }
                                continue;
                            }
                        }
                        else if (agora < visto.reagirAte) {
                            continue;
                        }
                    }
                    if (last && agora - last < REGRA_20S_MS && (tempoMs == null || tempoMs > 25_000))
                        continue;
                    if (last && agora - last < 3200)
                        continue;
                }
                let rankingValores = [];
                if (alvo > 1 && posicao !== alvo && (posicao == null || posicao > alvo || posicao < alvo)) {
                    try {
                        const ttl = (isWar || precisaDesempate || (tempoMs != null && tempoMs < 15_000)) ? 900 : 1200;
                        const rk = await (0, portal_1.fetchRanking)(d.cnpj, licitacaoId, sessItem.id, { maxAgeMs: ttl });
                        rankingValores = rk.posicoes.map(p => p.valor).sort((a, b) => a - b);
                    }
                    catch { }
                }
                const ranking = { posicao, posicaoRaw: sessItem.posicaoRaw ?? null, estaVencendo: sessItem.estaVencendo ?? null, valores: rankingValores, qtdLances: sessItem.qtdLances ?? null, autorMelhor: sessItem.autorMelhor ?? null };
                // Piso efetivo (Fase 3): piso manual vence; sem ele, exequibilidade% da disputa
                // sobre o valor de referência do portal (ex: exeq 50 + ref 3,75 → piso 1,88).
                // Sem ref e sem piso: sem trava (comportamento anterior).
                const exeq = Number(d.exequibilidade ?? 50);
                const ref = sessItem.referencia ?? null;
                const pisoEfetivo = item.piso != null ? item.piso
                    : (ref != null && Number.isFinite(ref) && ref > 0 && Number.isFinite(exeq) && exeq > 0 && exeq <= 100)
                        ? +(ref * exeq / 100).toFixed(2) : null;
                const itemEfetivo = pisoEfetivo !== item.piso ? { ...item, piso: pisoEfetivo } : item;
                // Se houver guerra, podemos forçar o item a ser mais agressivo (estratégia interna do decidirLance)
                const estado = { loteId: item.loteId, menorLance: menor, meuLance: sessItem.meuLance ?? null, tempoRestanteMs: tempoMs, fase: fase, modo: d.modo, ranking, isWar };
                const valor = (0, engine_1.decidirLance)(itemEfetivo, estado, hora.getTime());
                if (valor == null)
                    continue;
                // Nunca repetir/cobrir o NOSSO próprio valor (cache stale entre poll 3.5s e tick 1.1s
                // fazia o bot re-lancar 4.06 sobre o próprio 4.06 → rejeição certa + cooldown).
                const meu = sessItem.meuLance ?? null;
                if (meu != null && Math.abs(valor - meu) < 1e-9)
                    continue;
                if (alvo === 1 && meu != null && valor >= meu - 1e-9)
                    continue;
                if ((0, live_1.isLanceCooldown)(d.cnpj, sessItem.id))
                    continue;
                const { listAutos: listAutos2 } = await Promise.resolve().then(() => __importStar(require("./store")));
                const autos2 = await listAutos2().catch(() => new Map());
                if (autos2.get(d.id) === false)
                    continue;
                if (pisoEfetivo != null && valor < pisoEfetivo - 1e-9)
                    continue;
                if (alvo === 1) {
                    if (menor != null && valor >= menor - 1e-9)
                        continue;
                    if (item.intervaloMinimo && menor != null && menor - valor < item.intervaloMinimo - 1e-9)
                        continue;
                }
                else {
                    if (menor != null && valor <= menor + 1e-9)
                        continue;
                    if (rankingValores.length >= alvo) {
                        const alvoV = rankingValores[alvo - 1];
                        const sup = rankingValores[alvo - 2];
                        if (valor >= alvoV - 1e-9)
                            continue;
                        if (valor <= sup + 1e-9)
                            continue;
                    }
                    else {
                        if (menor != null && valor >= menor - 1e-9)
                            continue;
                    }
                }
                await (0, queue_bull_1.enqueueLance)({ licitacaoId, cnpj: d.cnpj, loteId: item.loteId, sessItemId: sessItem.id, valor, disputaId: d.id });
                // 4) Agenda o PRÓXIMO lance com delay aleatório seguindo o tempo do item.
                //    Se o cronômetro não permite esperar (tempo < delay), o próximo tick libera
                //    mesmo assim — nunca perde o item por "esperar demais".
                const delay = (0, engine_1.calcularDelayHumano)(tempoMs, { emGuerra: isWar });
                const esperaEfetiva = (tempoMs != null && tempoMs < delay)
                    ? Math.max(3200, Math.min(delay, Math.max(0, tempoMs - 1500)))
                    : delay;
                nextLanceAt.set(histKey, Date.now() + esperaEfetiva);
                ultimoEnvio.set(histKey, Date.now());
                if (nextLanceAt.size > 5000) {
                    const c = Date.now();
                    for (const [k, v] of nextLanceAt)
                        if (v < c - 600_000)
                            nextLanceAt.delete(k);
                }
                console.log(`[engine] ${d.id} item=${item.loteId} lance=${valor} menor=${menor} meu=${sessItem.meuLance ?? "-"} pos=${posicao ?? "?"}${sessItem.posicaoRaw ? `(${sessItem.posicaoRaw})` : ""} tempo=${sessItem.tempo || "?"} prox em ${(esperaEfetiva / 1000).toFixed(1)}s${isWar ? " (guerra)" : ""}${pisoEfetivo != null && item.piso == null ? ` pisoAuto=${pisoEfetivo}` : ""}`);
            }
        }
    }
    finally {
        tickEmVoo = false;
    }
}
//# sourceMappingURL=engine-runner.js.map