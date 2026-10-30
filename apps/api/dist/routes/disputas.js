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
const shared_1 = require("@licitabot/shared");
const store_1 = require("../store");
const store_2 = require("../store");
const router = (0, express_1.Router)();
router.get("/:id/auto", async (req, res, next) => { try {
    res.json({ id: String(req.params.id), auto: await (0, store_2.getDisputaAuto)(String(req.params.id)) });
}
catch (e) {
    next(e);
} });
router.post("/:id/auto", async (req, res, next) => { try {
    const id = String(req.params.id);
    const on = !!req.body?.on;
    await (0, store_2.setDisputaAuto)(id, on);
    res.json({ id, auto: on });
}
catch (e) {
    next(e);
} });
router.patch("/:id/itens/:loteId", async (req, res, next) => {
    try {
        const disputaId = String(req.params.id);
        const loteId = String(req.params.loteId);
        const disputa = await (0, store_1.getDisputa)(disputaId);
        if (!disputa)
            return res.status(404).json({ error: "Disputa não encontrada" });
        const norm = (s) => { const t = String(s ?? "").trim(); const n = t.replace(/^0+/, ""); return n === "" ? "0" : n; };
        const idx = disputa.itens.findIndex((x) => x.loteId === loteId || x.id === loteId || norm(x.loteId) === norm(loteId));
        if (idx < 0)
            return res.status(404).json({ error: "Item não encontrado (loteId)" });
        if (req.body?.posicaoAlvo !== undefined) {
            const pa = Number(req.body?.posicaoAlvo);
            if (!Number.isInteger(pa) || pa < 1 || pa > 10)
                return res.status(400).json({ error: "posicaoAlvo deve ser 1..10" });
            disputa.itens[idx].posicaoAlvo = pa;
        }
        if (req.body?.ativo !== undefined) {
            disputa.itens[idx].ativo = !!req.body.ativo;
        }
        if (req.body?.decremento !== undefined) {
            const dec = Number(String(req.body.decremento).replace(",", "."));
            if (!Number.isFinite(dec) || dec <= 0)
                return res.status(400).json({ error: "decremento deve ser >0" });
            disputa.itens[idx].decremento = dec;
        }
        if (req.body?.estrategia !== undefined) {
            const est = String(req.body.estrategia);
            if (!["cobrir_minimo", "agressivo", "conservador", "sniper"].includes(est))
                return res.status(400).json({ error: "estrategia inválida" });
            disputa.itens[idx].estrategia = est;
        }
        if (req.body?.posicaoAlvo === undefined && req.body?.ativo === undefined && req.body?.decremento === undefined && req.body?.estrategia === undefined)
            return res.status(400).json({ error: "informe posicaoAlvo (1..10), ativo, decremento e/ou estrategia" });
        disputa.updatedAt = new Date().toISOString();
        const errs = (0, shared_1.validarDisputa)(disputa);
        if (errs.length)
            return res.status(400).json({ error: errs });
        await (0, store_1.saveDisputa)(disputa);
        res.json(disputa);
    }
    catch (e) {
        next(e);
    }
});
router.get("/", async (_req, res, next) => { try {
    res.json(await (0, store_1.listDisputas)());
}
catch (e) {
    next(e);
} });
router.post("/", async (req, res, next) => {
    try {
        const now = new Date().toISOString();
        const d = { id: req.body.id || `disp-${Date.now()}`, processoId: req.body.processoId, editalId: req.body.editalId, cnpj: String(req.body.cnpj || "").replace(/\D/g, ""), modo: req.body.modo, dataHora: req.body.dataHora, status: req.body.status || "rascunho", exequibilidade: req.body.exequibilidade != null ? Number(String(req.body.exequibilidade).replace(",", ".")) : 50, itens: req.body.itens || [], createdAt: now, updatedAt: now };
        const errs = (0, shared_1.validarDisputa)(d);
        if (errs.length)
            return res.status(400).json({ error: errs });
        if (!(0, shared_1.validarCNPJ)(d.cnpj))
            return res.status(400).json({ error: "CNPJ inválido" });
        // Trava anti-duplicata: mesmo pregão + mesmo CNPJ ativo não pode repetir
        const existentes = await (0, store_1.listDisputas)();
        const dup = existentes.find((x) => String(x.processoId) === String(d.processoId) && String(x.cnpj).replace(/\D/g, "") === d.cnpj && (x.status === "agendada" || x.status === "em_andamento"));
        if (dup)
            return res.status(409).json({ error: `Já existe disputa ${dup.id} para o pregão ${d.processoId} com o CNPJ ${d.cnpj}. Para 2 empresas, troque o CNPJ. Exclua a duplicata antes de recriar.` });
        await (0, store_1.saveDisputa)(d);
        res.status(201).json(d);
    }
    catch (e) {
        next(e);
    }
});
router.get("/:id", async (req, res, next) => { try {
    const d = await (0, store_1.getDisputa)(String(req.params.id));
    if (!d)
        return res.status(404).json({ error: "Disputa não encontrada" });
    res.json(d);
}
catch (e) {
    next(e);
} });
router.put("/:id", async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const existing = await (0, store_1.getDisputa)(id);
        if (!existing)
            return res.status(404).json({ error: "Disputa não encontrada" });
        const updated = { ...existing, ...req.body, id, updatedAt: new Date().toISOString() };
        const errs = (0, shared_1.validarDisputa)(updated);
        if (errs.length)
            return res.status(400).json({ error: errs });
        await (0, store_1.saveDisputa)(updated);
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
});
router.delete("/:id", async (req, res, next) => { try {
    await (0, store_1.deleteDisputa)(String(req.params.id));
    res.json({ ok: true });
}
catch (e) {
    next(e);
} });
router.post("/panic", async (req, res, next) => {
    try {
        const { purgeAllQueues } = await Promise.resolve().then(() => __importStar(require("../queue-bull")));
        const result = await (0, store_1.panic)();
        await purgeAllQueues();
        res.json(result);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=disputas.js.map