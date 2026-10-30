"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.post("/login", async (req, res, next) => {
    try {
        const s = zod_1.z.object({ cnpj: zod_1.z.string().min(14) });
        const b = s.parse(req.body);
        const cnpj = String(b.cnpj).replace(/\D/g, "");
        if (!cnpj)
            return res.status(400).json({ ok: false, error: "cnpj obrigatório" });
        const r = await (0, db_1.query)("select cnpj, apelido, razao_social from cnpj_contas where cnpj=$1", [cnpj]);
        if (!r.rows.length)
            return res.status(404).json({ ok: false, error: "Empresa não cadastrada. Cadastre em /empresas" });
        const row = r.rows[0];
        return res.json({ ok: true, cnpj, nome: row.razao_social || row.apelido || cnpj, apelido: row.apelido ?? null });
    }
    catch (e) {
        next(e);
    }
});
router.get("/me", async (req, res, next) => {
    try {
        const cnpj = String(req.query.cnpj ?? "").replace(/\D/g, "");
        if (!cnpj)
            return res.status(400).json({ error: "cnpj obrigatório" });
        const r = await (0, db_1.query)("select cnpj, apelido, razao_social from cnpj_contas where cnpj=$1", [cnpj]);
        if (!r.rows.length)
            return res.status(404).json({ error: "Empresa não encontrada" });
        res.json({ ok: true, ...r.rows[0] });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map