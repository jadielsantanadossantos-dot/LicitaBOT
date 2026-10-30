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
exports.lanceLog = exports.liveState = void 0;
exports.liveKey = liveKey;
exports.isLanceCooldown = isLanceCooldown;
exports.sessaoBloqueadaAte = sessaoBloqueadaAte;
exports.isWafAtivo = isWafAtivo;
exports.ensureSession = ensureSession;
exports.tickLive = tickLive;
exports.watchLicitacao = watchLicitacao;
exports.unwatchLicitacao = unwatchLicitacao;
exports.enviarLance = enviarLance;
exports.getLive = getLive;
const portal_1 = require("@licitabot/portal");
const portal_2 = require("@licitabot/portal");
const db_1 = require("./db");
exports.liveState = new Map();
exports.lanceLog = [];
const MAX_LOG = 500;
function pushLog(e) { exports.lanceLog.unshift(e); if (exports.lanceLog.length > MAX_LOG)
    exports.lanceLog.length = MAX_LOG; }
function liveKey(licitacaoId, cnpj) { return `${String(licitacaoId)}:${String(cnpj).replace(/\D/g, "")}`; }
// Cooldown por item após rejeição do portal: evita retentar todo tick (1.5s)
// contra regras de intervalo e reduz carga/WAF. Chave = cnpj:sessItemId.
const lanceCooldown = new Map();
function cooldownKey(cnpj, itemId) { return `${cnpj.replace(/\D/g, "")}:${String(itemId)}`; }
function isLanceCooldown(cnpj, itemId) {
    const k = cooldownKey(cnpj, itemId);
    const ate = lanceCooldown.get(k) ?? 0;
    if (ate > Date.now())
        return true;
    if (ate)
        lanceCooldown.delete(k);
    return false;
}
function aplicarCooldownRejeicao(cnpj, itemId, mensagem) {
    const m = mensagem || "";
    let ms = 0;
    let motivo = "";
    if (/entre seus lances/i.test(m) && /20 segundos/i.test(m)) {
        ms = 25000;
        motivo = "20s-proprios";
    }
    else if (/intervalo entre os lances/i.test(m)) {
        ms = 4000;
        motivo = "3s-geral";
    }
    else if (/seu lance atual/i.test(m)) {
        ms = 5000;
        motivo = "proprio-lance";
    }
    if (ms > 0) {
        if (lanceCooldown.size > 5000) {
            const agora = Date.now();
            for (const [k, v] of lanceCooldown)
                if (v <= agora)
                    lanceCooldown.delete(k);
        }
        lanceCooldown.set(cooldownKey(cnpj, itemId), Date.now() + ms);
        console.log(`[live] cooldown ${motivo} ${ms / 1000}s item=${itemId} cnpj=${String(cnpj).slice(-4)}`);
    }
}
let reloginInFlight = new Map();
// Backoff: evita martelar login/WAF quando a sessão está morta.
// Falha comum = 5min; com captcha WAF ativo = 15min (só humano resolve).
const reloginBloqueadoAte = new Map();
const wafAte = new Map();
const BACKOFF_FALHA_MS = 5 * 60 * 1000;
const BACKOFF_WAF_MS = 15 * 60 * 1000;
function sessaoBloqueadaAte(cnpj) {
    return reloginBloqueadoAte.get(cnpj.replace(/\D/g, "")) ?? 0;
}
function isWafAtivo(cnpj) {
    return (wafAte.get(cnpj.replace(/\D/g, "")) ?? 0) > Date.now();
}
async function ensureSession(cnpj) {
    const clean = cnpj.replace(/\D/g, "");
    if (await (0, portal_1.isSessionValid)(cnpj)) {
        reloginBloqueadoAte.delete(clean);
        return true;
    }
    if (reloginInFlight.has(cnpj))
        return reloginInFlight.get(cnpj);
    if ((reloginBloqueadoAte.get(clean) ?? 0) > Date.now())
        return false;
    const p = (async () => {
        // Antes de abrir browser: checa se é captcha WAF (só humano resolve — não adianta tentar login)
        try {
            const { checkSessao } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
            const estado = await checkSessao(cnpj);
            if (estado === "waf") {
                console.log(`[live] WAF/captcha ativo para ${cnpj} — aguardando resolução manual (sem novas tentativas por ${BACKOFF_WAF_MS / 60000}min)`);
                wafAte.set(clean, Date.now() + BACKOFF_WAF_MS);
                reloginBloqueadoAte.set(clean, Date.now() + BACKOFF_WAF_MS);
                return false;
            }
            if (estado === "ok") {
                reloginBloqueadoAte.delete(clean);
                return true;
            }
        }
        catch { }
        console.log(`[live] sessão expirada ${cnpj} — relogin`);
        const ok = await (0, portal_1.loginWithCredentials)(cnpj);
        console.log(`[live] relogin ${cnpj} => ${ok}`);
        if (ok && await (0, portal_1.isSessionValid)(cnpj)) {
            reloginBloqueadoAte.delete(clean);
            return true;
        }
        reloginBloqueadoAte.set(clean, Date.now() + BACKOFF_FALHA_MS);
        if (!ok)
            await new Promise(r => setTimeout(r, 2000));
        return false;
    })();
    reloginInFlight.set(cnpj, p);
    const res = await p;
    reloginInFlight.delete(cnpj);
    return res;
}
async function fetchPagina(cnpj, licitacaoId, p, tentativas = 3) {
    for (let t = 1; t <= tentativas; t++) {
        try {
            const h = await (0, portal_2.obterHtmlAba)(cnpj, licitacaoId, 0, p, 1);
            if (h)
                return h;
        }
        catch { }
        if (t < tentativas)
            await new Promise(r => setTimeout(r, 400 * t));
    }
    return "";
}
async function fetchAllItens(cnpj, licitacaoId) {
    const html = await fetchPagina(cnpj, licitacaoId, 1);
    if (!html)
        return [];
    const first = (0, portal_2.parseItens)(html);
    if (!first.length)
        return [];
    if (first.length < 10)
        return first;
    const all = [...first];
    const seen = new Set(first.map(x => x.id));
    // Paginação até 50 páginas x ~10 = 500 itens (antes parava em 12x10=120 e cortava pregões grandes como 127)
    const MAX_PAGINAS = 50;
    for (let p = 2; p <= MAX_PAGINAS; p++) {
        const h = await fetchPagina(cnpj, licitacaoId, p);
        if (!h)
            break; // página inacessível após retries = fim (ou instabilidade — tickLive mantém cache anterior se parcial)
        const itens = (0, portal_2.parseItens)(h);
        if (!itens.length)
            break;
        let added = 0;
        for (const it of itens) {
            if (!seen.has(it.id)) {
                seen.add(it.id);
                all.push(it);
                added++;
            }
        }
        // Página repetida (portal devolveu os mesmos itens) = fim
        if (added === 0)
            break;
        if (itens.length < 10)
            break;
        if (p < MAX_PAGINAS)
            await new Promise(r => setTimeout(r, 120));
    }
    return all;
}
async function tickLive(licitacaoId, cnpj) {
    const k = liveKey(licitacaoId, cnpj);
    const hasSession = await ensureSession(cnpj);
    if (!hasSession) {
        const waf = isWafAtivo(cnpj);
        exports.liveState.set(k, { itens: exports.liveState.get(k)?.itens ?? [], chat: exports.liveState.get(k)?.chat ?? [], status: waf ? "bloqueio WAF/captcha do portal — resolução manual necessária" : "sessão expirada — relogin falhou", hora: null, updatedAt: new Date().toISOString(), error: waf ? "waf_challenge" : "session_expired" });
        return;
    }
    try {
        const prev = exports.liveState.get(k);
        const ultimoId = prev?.chat?.length ? Math.max(...prev.chat.map(m => Number(m.id) || 0)) : 0;
        const [hora, status, chat, itens] = await Promise.all([
            (0, portal_2.obterHoraServidor)(cnpj).catch(() => null),
            (0, portal_2.obterStatus)(cnpj, licitacaoId).catch(() => ""),
            (0, portal_2.obterChat)(cnpj, licitacaoId, ultimoId).catch(() => ({ mensagens: [] })),
            fetchAllItens(cnpj, licitacaoId).catch(() => []),
        ]);
        const finalItensRaw = (() => {
            const prevItens = prev?.itens ?? [];
            if (!itens.length)
                return prevItens;
            if (!prevItens.length)
                return itens;
            if (itens.length < prevItens.length) {
                const byId = new Map(itens.map(x => [String(x.id), x]));
                const byNum = new Map(itens.map(x => [String(x.numero), x]));
                const merged = [];
                for (const p of prevItens) {
                    const fresh = byId.get(String(p.id)) ?? byNum.get(String(p.numero));
                    merged.push(fresh ?? p);
                }
                const prevIds = new Set(prevItens.map(x => String(x.id)));
                for (const n of itens)
                    if (!prevIds.has(String(n.id)))
                        merged.push(n);
                if (itens.length < prevItens.length * 0.8) {
                    console.log(`[live] ${licitacaoId}/${cnpj} paginação parcial (${itens.length}/${prevItens.length}) — merge mantendo ${merged.length} itens`);
                }
                return merged;
            }
            return itens;
        })();
        const finalItens = (() => {
            const prevItens = prev?.itens ?? [];
            if (!prevItens.length)
                return finalItensRaw;
            const prevById = new Map(prevItens.map(p => [String(p.id), p]));
            const prevByNum = new Map(prevItens.map(p => [String(p.numero), p]));
            return finalItensRaw.map(it => {
                if (it.descricao && String(it.descricao).trim())
                    return it;
                const prv = prevById.get(String(it.id)) ?? prevByNum.get(String(it.numero)) ?? null;
                if (prv?.descricao)
                    return { ...it, descricao: prv.descricao };
                return it;
            });
        })();
        const newMsgs = (chat?.mensagens ?? []);
        let merged = [];
        if (prev?.chat?.length) {
            const map = new Map();
            for (const m of prev.chat)
                map.set(String(m.id), m);
            for (const m of newMsgs)
                map.set(String(m.id), m);
            merged = [...map.values()];
        }
        else {
            merged = [...newMsgs];
        }
        merged.sort((a, b) => Number(b.id) - Number(a.id));
        if (merged.length > 500)
            merged = merged.slice(0, 500);
        const finalHora = hora ? hora.toISOString() : (prev?.hora ?? null);
        const finalStatus = status || prev?.status || "";
        exports.liveState.set(k, { itens: finalItens, chat: merged, status: finalStatus, hora: finalHora, updatedAt: new Date().toISOString() });
    }
    catch (e) {
        const prev = exports.liveState.get(k);
        exports.liveState.set(k, { itens: prev?.itens ?? [], chat: prev?.chat ?? [], status: prev?.status ?? "", hora: prev?.hora ?? null, updatedAt: new Date().toISOString(), error: e.message?.slice(0, 400) });
    }
}
let pollTimer = null;
const polls = new Map();
function msDeTempo(t) {
    if (!t)
        return null;
    const m = t.match(/(\d+):(\d+):(\d+)/) ?? t.match(/(\d+):(\d+)/);
    if (!m)
        return null;
    if (m.length === 4)
        return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000;
    return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}
// Tier de polling (508293): reta final e desempate precisam de 1.2-2s; normal 3.5s evita WAF
function pollTier() {
    let quente = false;
    for (const v of exports.liveState.values()) {
        for (const it of v.itens) {
            const ms = msDeTempo(it.tempo);
            if (ms != null && ms < 15000)
                return "critico";
            if (ms != null && ms < 30000)
                quente = true;
            const pr = String(it.posicaoRaw ?? "").toLowerCase();
            if (pr.includes("empat") || it.estaVencendo === false)
                quente = true;
        }
    }
    return quente ? "quente" : "normal";
}
function isUrgent() {
    return pollTier() !== "normal";
}
function watchLicitacao(licitacaoId, cnpj) {
    const k = liveKey(licitacaoId, cnpj);
    polls.set(k, { licitacaoId: String(licitacaoId), cnpj: String(cnpj).replace(/\D/g, "") });
    if (!pollTimer)
        startPoll();
    tickLive(licitacaoId, cnpj);
}
function unwatchLicitacao(licitacaoId, cnpj) {
    if (cnpj) {
        polls.delete(liveKey(licitacaoId, cnpj));
    }
    else {
        for (const k of [...polls.keys()])
            if (k.startsWith(`${String(licitacaoId)}:`))
                polls.delete(k);
    }
}
function startPoll() {
    if (pollTimer)
        return;
    const loop = async () => {
        const entries = [...polls.values()];
        await Promise.all(entries.map(({ licitacaoId, cnpj }) => tickLive(licitacaoId, cnpj).catch(() => { })));
        if (!polls.size) {
            if (pollTimer)
                clearInterval(pollTimer);
            pollTimer = null;
            return;
        }
        // crítico (<15s p/ fechar): 1.2s | quente (desempate/<30s): 2s | normal: 3.5s + jitter 1s
        const tier = pollTier();
        const baseDelay = tier === "critico" ? 1200 : tier === "quente" ? 2000 : 3500;
        const jitter = Math.random() * 1000; // Adiciona até 1 segundo de variação
        const delay = baseDelay + jitter;
        pollTimer = setTimeout(loop, delay);
    };
    pollTimer = setTimeout(loop, isUrgent() ? 1500 : 3500);
}
// Keepalive 30s: sessão morta = bot cego; isSessionValid é 1 GET leve no DashBoard por CNPJ
setInterval(async () => {
    const cnpjs = [...new Set([...polls.values()].map(v => typeof v === "string" ? v : v.cnpj))];
    await Promise.all(cnpjs.map(async (cnpj) => {
        const ok = await (0, portal_1.isSessionValid)(cnpj).catch(() => false);
        if (!ok)
            await ensureSession(cnpj).catch(() => { });
        else {
            try {
                await (0, portal_2.obterHoraServidor)(cnpj);
            }
            catch { }
        }
    }));
}, 30000);
async function enviarLance(licitacaoId, cnpj, itemId, valor) {
    const has = await ensureSession(cnpj);
    if (!has) {
        const motivo = isWafAtivo(cnpj) ? "bloqueio WAF/captcha — resolva manualmente e reconecte" : "sessão expirada e relogin falhou";
        try {
            await (0, db_1.query)("insert into lance_logs(licitacao_id, item_id, valor, cnpj, ok, mensagem, raw_response) values($1, $2, $3, $4, $5, $6, $7)", [licitacaoId, itemId, valor, cnpj, false, motivo, ""]);
        }
        catch (e) {
            console.error("[live] erro ao salvar log de lance (sem sessão)", e);
        }
        pushLog({ ts: new Date().toISOString(), licitacaoId, itemId, valor, cnpj, ok: false, msg: motivo });
        return { ok: false, mensagem: motivo, raw: "" };
    }
    const r = await (0, portal_2.enviarLanceViaFetch)(cnpj, licitacaoId, itemId, valor);
    if (!r.ok)
        aplicarCooldownRejeicao(cnpj, itemId, r.mensagem);
    // LOG AUDITÁVEL
    try {
        await (0, db_1.query)("insert into lance_logs(licitacao_id, item_id, valor, cnpj, ok, mensagem, raw_response) values($1, $2, $3, $4, $5, $6, $7)", [licitacaoId, itemId, valor, cnpj, r.ok, r.mensagem, r.raw]);
    }
    catch (e) {
        console.error("[live] erro ao salvar log de lance", e);
    }
    if (!r.ok && r.mensagem.toLowerCase().includes("sessão expirada")) {
        const ok2 = await ensureSession(cnpj);
        if (ok2) {
            const r2 = await (0, portal_2.enviarLanceViaFetch)(cnpj, licitacaoId, itemId, valor);
            try {
                await (0, db_1.query)("insert into lance_logs(licitacao_id, item_id, valor, cnpj, ok, mensagem, raw_response) values($1, $2, $3, $4, $5, $6, $7)", [licitacaoId, itemId, valor, cnpj, r2.ok, r2.mensagem, r2.raw]);
            }
            catch (e) {
                console.error("[live] erro ao salvar log de lance (retry)", e);
            }
            pushLog({ ts: new Date().toISOString(), licitacaoId, itemId, valor, cnpj, ok: r2.ok, msg: r2.mensagem.slice(0, 400) });
            if (!r2.ok)
                aplicarCooldownRejeicao(cnpj, itemId, r2.mensagem);
            return r2;
        }
    }
    pushLog({ ts: new Date().toISOString(), licitacaoId, itemId, valor, cnpj, ok: r.ok, msg: r.mensagem.slice(0, 400) });
    return r;
}
function getLive(licitacaoId, cnpj) {
    if (cnpj)
        return exports.liveState.get(liveKey(licitacaoId, cnpj)) ?? null;
    const direct = exports.liveState.get(licitacaoId);
    if (direct)
        return direct;
    for (const [k, v] of exports.liveState)
        if (k.startsWith(`${String(licitacaoId)}:`))
            return v;
    return null;
}
//# sourceMappingURL=live.js.map