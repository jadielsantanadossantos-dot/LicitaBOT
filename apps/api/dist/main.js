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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const portal_1 = require("@licitabot/portal");
const store_1 = require("./store");
const scheduler_1 = require("./scheduler");
const live_1 = require("./live");
const portal_2 = require("@licitabot/portal");
const engine_runner_1 = require("./engine-runner");
const db_1 = require("./db");
const cnpjs_1 = __importDefault(require("./routes/cnpjs"));
const editais_1 = __importDefault(require("./routes/editais"));
const disputas_1 = __importDefault(require("./routes/disputas"));
const live_2 = __importDefault(require("./routes/live"));
const auth_1 = __importDefault(require("./routes/auth"));
async function firstCnpj() { const l = await (0, store_1.listCNPJs)(); return l[0]?.cnpj; }
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: "*" }));
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ ok: true, db: "postgres" }));
app.get("/health/redis", async (_req, res) => {
    try {
        const { isRedisAvailable } = await Promise.resolve().then(() => __importStar(require("./queue-bull")));
        const ok = await isRedisAvailable();
        res.json({ redis: ok ? "connected" : "fallback-memoria", redisUrlSet: !!(process.env.REDIS_URL || "") });
    }
    catch (e) {
        res.json({ redis: "error", error: e.message });
    }
});
app.use("/api/auth", auth_1.default);
app.use("/api/cnpjs", cnpjs_1.default);
app.use("/api/editais", editais_1.default);
app.use("/api/disputas", disputas_1.default);
app.use("/api/live", live_2.default);
app.get("/api/agenda", async (_req, res, next) => { try {
    res.json(await (0, scheduler_1.agendaSnapshot)());
}
catch (e) {
    next(e);
} });
app.get("/api/hora", async (req, res, next) => { try {
    const cnpj = String(req.query.cnpj || "") || await firstCnpj() || undefined;
    const h = cnpj ? await (0, portal_2.obterHoraServidor)(cnpj) : await (0, portal_2.obterHoraServidor)();
    res.json({ hora: h ? h.toISOString() : null, local: new Date().toISOString() });
}
catch (e) {
    next(e);
} });
app.post("/api/lance", async (req, res, next) => {
    try {
        const licitacaoId = String(req.body.licitacaoId || req.body.processoId || "");
        const itemId = String(req.body.itemId || req.body.loteId || "");
        const valor = Number(req.body.valor);
        const cnpj = String(req.body.cnpj || "").replace(/\D/g, "");
        if (!licitacaoId || !itemId || !valor || !cnpj)
            return res.status(400).json({ error: "licitacaoId, itemId, valor, cnpj obrigatórios" });
        if ((0, live_1.isLanceCooldown)(cnpj, itemId))
            return res.status(429).json({ error: "aguarde cooldown 20s/3s do portal", retryAfterMs: 3000 });
        const r = await (0, live_1.enviarLance)(licitacaoId, cnpj, itemId, valor);
        res.status(r.ok ? 200 : 400).json(r);
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/lances/log", (_req, res) => res.json(live_1.lanceLog.slice(0, 50)));
// Fase 4: histórico auditável com filtros (DB; cai p/ memória se DB fora)
app.get("/api/lance_logs", async (req, res, next) => {
    try {
        const { query } = await Promise.resolve().then(() => __importStar(require("./db")));
        const lic = req.query.licitacao ? String(req.query.licitacao) : null;
        const item = req.query.item ? String(req.query.item) : null;
        const cnpj = req.query.cnpj ? String(req.query.cnpj).replace(/\D/g, "") : null;
        const ok = req.query.ok !== undefined && req.query.ok !== "" ? String(req.query.ok) === "true" : null;
        const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
        const conds = [];
        const vals = [];
        let i = 1;
        if (lic) {
            conds.push(`licitacao_id=$${i++}`);
            vals.push(lic);
        }
        if (item) {
            conds.push(`item_id=$${i++}`);
            vals.push(item);
        }
        if (cnpj) {
            conds.push(`regexp_replace(cnpj,'\\D','','g')=$${i++}`);
            vals.push(cnpj);
        }
        if (ok !== null) {
            conds.push(`ok=$${i++}`);
            vals.push(ok);
        }
        const where = conds.length ? `where ${conds.join(" and ")}` : "";
        const r = await query(`select id, ts, licitacao_id as "licitacaoId", item_id as "itemId", valor, cnpj, ok, mensagem as msg from lance_logs ${where} order by ts desc limit $${i}`, [...vals, limit]);
        res.json(r.rows);
    }
    catch (e) {
        // DB fora: devolve o log em memória filtrado na mão
        try {
            const lic = req.query.licitacao ? String(req.query.licitacao) : null;
            const item = req.query.item ? String(req.query.item) : null;
            const cnpj = req.query.cnpj ? String(req.query.cnpj).replace(/\D/g, "") : null;
            const ok = req.query.ok !== undefined && req.query.ok !== "" ? String(req.query.ok) === "true" : null;
            const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
            res.json(live_1.lanceLog
                .filter(l => (!lic || l.licitacaoId === lic) && (!item || l.itemId === item)
                && (!cnpj || String(l.cnpj).replace(/\D/g, "") === cnpj) && (ok === null || l.ok === ok))
                .slice(0, limit));
        }
        catch (e2) {
            next(e2);
        }
    }
});
app.get("/api/pregoes/participando", async (req, res, next) => {
    try {
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!cnpj)
            return res.status(400).json({ error: "nenhum CNPJ cadastrado" });
        const { buscarSeusPregoes } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
        const r = await buscarSeusPregoes(cnpj, { situacao: req.query.situacao ? String(req.query.situacao) : undefined, q: req.query.q ? String(req.query.q) : undefined });
        res.json(r);
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/pregoes", async (req, res, next) => {
    try {
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!cnpj)
            return res.status(400).json({ error: "nenhum CNPJ cadastrado" });
        const dataAbertura = String(req.query.dataAbertura || req.query.data || "") || undefined;
        const dataDe = String(req.query.dataDe || dataAbertura || "") || undefined;
        const dataAte = String(req.query.dataAte || dataAbertura || "") || undefined;
        const r = await (0, portal_1.buscarEditais)({ q: req.query.q, uf: req.query.uf, page: Number(req.query.pagina || 1), pageSize: 50, dataDe, dataAte, dataAbertura }, cnpj);
        res.json(r);
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/ranking/:licitacaoId/:itemId", async (req, res, next) => {
    try {
        const licitacaoId = String(req.params.licitacaoId);
        const itemId = String(req.params.itemId);
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!licitacaoId || !itemId || !cnpj)
            return res.status(400).json({ error: "licitacaoId, itemId, cnpj obrigatórios" });
        const { fetchRanking } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
        res.json(await fetchRanking(cnpj, licitacaoId, itemId));
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/sessao", async (req, res, next) => {
    try {
        const id = String(req.query.id || "");
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!id || !cnpj)
            return res.status(400).json({ error: "id e cnpj obrigatórios" });
        const { isWafAtivo, sessaoBloqueadaAte } = await Promise.resolve().then(() => __importStar(require("./live")));
        const valida = await (0, portal_2.isSessionValid)(cnpj).catch(() => false);
        const waf = isWafAtivo(cnpj);
        const bloqueadaAte = sessaoBloqueadaAte(cnpj);
        const sessaoEstado = valida ? "ok" : waf ? "waf" : bloqueadaAte > Date.now() ? "bloqueada" : "expirada";
        // Com sessão morta não adianta bater no portal: retorna estado explícito em vez de itens:[] silencioso
        const html = valida ? await (0, portal_2.obterHtmlAba)(cnpj, id, 0, 1, 1) : "";
        res.json({ itens: html ? (0, portal_2.parseItens)(html) : [], htmlLen: html.length, sessaoValida: valida, waf, bloqueadaAte, sessaoEstado });
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/chat", async (req, res, next) => {
    try {
        const id = String(req.query.id || "");
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        const ultimo = Number(req.query.ultimo || 0);
        if (!id || !cnpj)
            return res.status(400).json({ error: "id e cnpj obrigatórios" });
        res.json(await (0, portal_2.obterChat)(cnpj, id, ultimo));
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/status", async (req, res, next) => {
    try {
        const id = String(req.query.id || "");
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!id || !cnpj)
            return res.status(400).json({ error: "id e cnpj obrigatórios" });
        res.json({ status: await (0, portal_2.obterStatus)(cnpj, id) });
    }
    catch (e) {
        next(e);
    }
});
app.get("/api/sessao/valid", async (req, res, next) => {
    try {
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!cnpj)
            return res.status(400).json({ error: "cnpj obrigatório" });
        const ok = await (0, portal_2.isSessionValid)(cnpj);
        const ck = await (0, portal_2.getCookiesHeader)(cnpj);
        res.json({ valid: ok, hasCookie: !!ck });
    }
    catch (e) {
        next(e);
    }
});
app.use((err, _req, res, _next) => {
    console.error("[api]", err?.message || err);
    res.status(err?.status || 500).json({ error: err?.message || String(err) });
});
async function bootstrap() {
    try {
        await (0, db_1.setupDb)();
        console.log("[main] Database schema synchronized");
    }
    catch (e) {
        console.warn("[main] DB indisponivel - API sobe sem DB:", e?.message || e);
    }
    try {
        (0, scheduler_1.startScheduler)();
    }
    catch (e) {
        console.warn("[scheduler] falhou:", e?.message || e);
    }
    try {
        (0, engine_runner_1.startEngine)();
    }
    catch (e) {
        console.warn("[engine] falhou:", e?.message || e);
    }
    const server = app.listen(config_1.config.port, "0.0.0.0", () => console.log(`API on http://0.0.0.0:${config_1.config.port} db=postgres express`));
    process.on("SIGTERM", async () => { try {
        const { closeQueues } = await Promise.resolve().then(() => __importStar(require("./queue-bull")));
        await closeQueues();
    }
    catch { } server.close(() => process.exit(0)); });
}
bootstrap();
//# sourceMappingURL=main.js.map