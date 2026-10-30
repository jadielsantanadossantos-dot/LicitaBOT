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
const express_1 = require("express");
const portal_1 = require("@licitabot/portal");
const store_1 = require("../store");
async function firstCnpj() { const l = await (0, store_1.listCNPJs)(); return l[0]?.cnpj; }
const router = (0, express_1.Router)();
// Favoritos — antes de /:id para não conflitar
router.get("/favoritos", async (_req, res, next) => {
    try {
        const { listFavoritos } = await Promise.resolve().then(() => __importStar(require("../store")));
        res.json(await listFavoritos());
    }
    catch (e) {
        next(e);
    }
});
router.post("/favoritos", async (req, res, next) => {
    try {
        const { saveFavorito } = await Promise.resolve().then(() => __importStar(require("../store")));
        const e = req.body;
        if (!e?.id)
            return res.status(400).json({ error: "id obrigatório" });
        res.json(await saveFavorito(e));
    }
    catch (e) {
        next(e);
    }
});
router.delete("/favoritos/:id", async (req, res, next) => {
    try {
        const { removeFavorito } = await Promise.resolve().then(() => __importStar(require("../store")));
        await removeFavorito(String(req.params.id));
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
router.get("/", async (req, res, next) => {
    try {
        const cnpjQ = String(req.query.cnpj || "") || undefined;
        const dataAbertura = String(req.query.dataAbertura || req.query.data || "") || undefined;
        const dataDe = String(req.query.dataDe || dataAbertura || "") || undefined;
        const dataAte = String(req.query.dataAte || dataAbertura || "") || undefined;
        const r = await (0, portal_1.buscarEditais)({ q: req.query.q, numero: req.query.numero, cidade: req.query.cidade, objeto: req.query.objeto, uf: req.query.uf, modo: req.query.modo, page: Number(req.query.page || 1), pageSize: Number(req.query.pageSize || 20), dataAbertura: dataAbertura || undefined, dataDe: dataDe || undefined, dataAte: dataAte || undefined }, cnpjQ ? String(cnpjQ).replace(/\D/g, "") : undefined);
        res.json(r);
    }
    catch (e) {
        next(e);
    }
});
router.get("/:id/lotes", async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const qCnpj = String(req.query.cnpj || "") || await firstCnpj();
        const lotes = await (0, portal_1.obterLotes)(id, qCnpj || undefined);
        res.json(lotes);
    }
    catch (e) {
        next(e);
    }
});
router.get("/:id/arquivos", async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const cnpj = String(req.query.cnpj || "") || await firstCnpj() || "";
        if (!id || !cnpj)
            return res.status(400).json({ error: "id e cnpj obrigatórios" });
        const { fetchWithJar } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
        const BASE_OP = "https://operacao.portaldecompraspublicas.com.br";
        const r = await fetchWithJar(cnpj, `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}`, { headers: { Accept: "text/html" } });
        const buf = await r.arrayBuffer();
        const ct = r.headers.get("content-type") || "";
        const html = ct.includes("iso-8859") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf).includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf);
        const links = [...html.matchAll(/href="([^"]*\/4\/Pregoes\/Download[^"]*)"/gi)].map(x => `${BASE_OP}${x[1].replace(/&amp;/g, "&")}`);
        const uniq = [...new Set(links)];
        res.json({ id, arquivos: uniq.map(href => ({ href, label: "Download edital" })), portalUrl: `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}` });
    }
    catch (e) {
        next(e);
    }
});
router.get("/:id", async (req, res, next) => {
    try {
        const e = await (0, portal_1.obterEdital)(String(req.params.id));
        if (!e)
            return res.status(404).json({ error: "Edital não encontrado" });
        res.json(e);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=editais.js.map