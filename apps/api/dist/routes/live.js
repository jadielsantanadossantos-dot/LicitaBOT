"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const live_1 = require("../live");
async function firstCnpj() { const l = await (0, store_1.listCNPJs)(); return l[0]?.cnpj; }
const router = (0, express_1.Router)();
router.get("/:id", async (req, res, next) => { try {
    const cnpj = String(req.query.cnpj || "").replace(/\D/g, "") || undefined;
    if (!cnpj)
        return res.json({ watching: false, itens: [], chat: [], status: "", hora: null, updatedAt: null, error: "cnpj_obrigatorio" });
    const q = (0, live_1.getLive)(String(req.params.id), cnpj);
    if (!q)
        return res.json({ watching: false, itens: [], chat: [], status: "", hora: null, updatedAt: null });
    res.json({ watching: true, ...q });
}
catch (e) {
    next(e);
} });
router.post("/:id/watch", async (req, res, next) => { try {
    const id = String(req.params.id);
    const cnpj = String(req.body?.cnpj || req.query.cnpj || "").replace(/\D/g, "") || await firstCnpj();
    if (!cnpj)
        return res.status(400).json({ error: "cnpj obrigatório" });
    (0, live_1.watchLicitacao)(id, cnpj);
    res.json({ ok: true, watching: id, cnpj });
}
catch (e) {
    next(e);
} });
router.post("/:id/unwatch", async (req, res, next) => { try {
    const cnpj = String(req.body?.cnpj || req.query.cnpj || "").replace(/\D/g, "") || undefined;
    if (!cnpj)
        return res.status(400).json({ error: "cnpj obrigatório — sem ele o servidor pararia TODAS as empresas deste pregão" });
    (0, live_1.unwatchLicitacao)(String(req.params.id), cnpj);
    res.json({ ok: true, cnpj });
}
catch (e) {
    next(e);
} });
exports.default = router;
//# sourceMappingURL=live.js.map