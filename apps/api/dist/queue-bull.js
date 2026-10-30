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
exports.isRedisAvailable = isRedisAvailable;
exports.enqueueLance = enqueueLance;
exports.closeQueues = closeQueues;
exports.purgeAllQueues = purgeAllQueues;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("./config");
let connection = null;
let available = false;
let lastTry = 0;
let connecting = null;
async function getConnection() {
    const url = config_1.config.redisUrl || process.env.REDIS_URL || "";
    if (!url) {
        if (Date.now() - lastTry > 30000) {
            console.log("[queue] REDIS_URL vazio — fallback memória (LanceQueue 10×CNPJ)");
            lastTry = Date.now();
        }
        return null;
    }
    if (available && connection && connection.status === "ready")
        return connection;
    if (connecting)
        return connecting;
    if (available && connection)
        return connection;
    if (Date.now() - lastTry < 10000 && !available && connection == null)
        return null;
    lastTry = Date.now();
    connecting = (async () => {
        try {
            const c = new ioredis_1.default(url, { maxRetriesPerRequest: null, enableReadyCheck: true, connectTimeout: 2000, lazyConnect: true, retryStrategy: (t) => Math.min(t * 200, 3000) });
            c.on("error", (e) => console.log("[queue] redis error", e.message.slice(0, 120)));
            c.on("close", () => { available = false; });
            c.on("ready", () => { available = true; console.log("[queue] Redis pronto", url.replace(/:[^@]+@/, "://***@")); });
            await c.connect();
            await c.ping();
            connection = c;
            available = true;
            console.log("[queue] Redis conectado", url.replace(/:[^@]+@/, "://***@"));
            return c;
        }
        catch (e) {
            console.log("[queue] Redis indisponível — fallback memória", e.message.slice(0, 120));
            available = false;
            return null;
        }
        finally {
            connecting = null;
        }
    })();
    return connecting;
}
setInterval(() => { if (!available)
    getConnection().catch(() => { }); }, 30000);
const queues = new Map();
const workers = new Map();
let fallback = null;
async function getFallback() {
    if (fallback)
        return fallback;
    const { LanceQueue } = await Promise.resolve().then(() => __importStar(require("@licitabot/engine")));
    fallback = new LanceQueue(10, 10);
    return fallback;
}
async function isRedisAvailable() { await getConnection(); return available; }
function queueName(cnpj) { return `lances:${cnpj}`; }
async function enqueueLance(payload) {
    const conn = await getConnection();
    if (conn) {
        const name = queueName(payload.cnpj);
        let q = queues.get(name);
        if (!q) {
            q = new bullmq_1.Queue(name, { connection: conn });
            queues.set(name, q);
            const w = new bullmq_1.Worker(name, async (job) => {
                const { enviarLance } = await Promise.resolve().then(() => __importStar(require("./live")));
                const { TelegramService } = await Promise.resolve().then(() => __importStar(require("./modules/telegram")));
                const r = await enviarLance(job.data.licitacaoId, job.data.cnpj, job.data.sessItemId, job.data.valor);
                console.log(`[bull] ${job.data.disputaId} ${job.data.loteId} alvo valor=${job.data.valor} ok=${r.ok}`);
                if (r.ok) {
                    await TelegramService.sendInfo(`Lance Enviado`, `CNPJ: ${job.data.cnpj}\nItem: ${job.data.loteId}\nValor: <b>R$ ${job.data.valor.toFixed(2)}</b>`);
                }
                else {
                    await TelegramService.sendAlert(`Falha no Lance`, `CNPJ: ${job.data.cnpj}\nItem: ${job.data.loteId}\nErro: ${r.mensagem}`);
                }
                if (!r.ok && /429|rate/i.test(r.mensagem))
                    throw new Error("429 " + r.mensagem);
                return r;
            }, { connection: conn, concurrency: 10, limiter: { max: 10, duration: 1000 } });
            w.on("failed", (job, err) => console.log(`[bull] failed ${job?.data.loteId} ${err.message.slice(0, 120)}`));
            workers.set(name, w);
        }
        const jobId = `${payload.cnpj}:${payload.loteId}:${payload.valor.toFixed(2)}`;
        const existing = await q.getJob(jobId).catch(() => null);
        if (existing)
            return;
        await q.add(payload.loteId, payload, {
            jobId,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 50,
        });
        return;
    }
    const fb = await getFallback();
    fb.enqueue({ loteId: payload.loteId, cnpj: payload.cnpj, valor: payload.valor, run: async () => {
            const { enviarLance } = await Promise.resolve().then(() => __importStar(require("./live")));
            const { TelegramService } = await Promise.resolve().then(() => __importStar(require("./modules/telegram")));
            const r = await enviarLance(payload.licitacaoId, payload.cnpj, payload.sessItemId, payload.valor);
            console.log(`[mem] ${payload.disputaId} ${payload.loteId} -> ${payload.valor} ok=${r.ok}`);
            if (r.ok) {
                await TelegramService.sendInfo(`Lance Enviado`, `CNPJ: ${payload.cnpj}\nItem: ${payload.loteId}\nValor: <b>R$ ${payload.valor.toFixed(2)}</b>`).catch(() => { });
            }
            else {
                await TelegramService.sendAlert(`Falha no Lance`, `CNPJ: ${payload.cnpj}\nItem: ${payload.loteId}\nErro: ${r.mensagem}`).catch(() => { });
            }
            if (!r.ok && /429|rate/i.test(r.mensagem))
                throw new Error("429");
        } });
}
async function closeQueues() {
    for (const w of workers.values())
        await w.close().catch(() => { });
    for (const q of queues.values())
        await q.close().catch(() => { });
    if (connection)
        await connection.quit().catch(() => { });
}
async function purgeAllQueues() {
    let removed = 0;
    for (const q of queues.values()) {
        try {
            // Descarta aguardando + atrasados + ativos órfãos; mantém workers vivos
            await q.pause().catch(() => { });
            await q.drain().catch(() => { });
            for (const state of ["wait", "delayed", "active", "failed"]) {
                try {
                    await q.clean(0, 1000, state).catch(() => { });
                }
                catch { }
            }
            await q.resume().catch(() => { });
            removed++;
        }
        catch { }
    }
    try {
        const fb = fallback;
        if (fb)
            removed += fb.clear();
    }
    catch { }
    // Engine-runner também checa auto=false antes de enfileirar, então
    // nada novo entra após o panic (store.panic desliga todos os autos)
    return { queues: queues.size, clearedFallback: !!fallback };
}
//# sourceMappingURL=queue-bull.js.map