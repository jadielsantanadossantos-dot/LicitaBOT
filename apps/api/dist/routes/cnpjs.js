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
const zod_1 = require("zod");
const shared_1 = require("@licitabot/shared");
const store_1 = require("../store");
const portal_1 = require("@licitabot/portal");
const router = (0, express_1.Router)();
router.get("/", async (_req, res, next) => { try {
    res.json(await (0, store_1.listCNPJs)());
}
catch (e) {
    next(e);
} });
router.post("/", async (req, res, next) => {
    try {
        const s = zod_1.z.object({ cnpj: zod_1.z.string(), apelido: zod_1.z.string().optional(), razaoSocial: zod_1.z.string().optional(), portalUser: zod_1.z.string().optional(), portalPass: zod_1.z.string().optional() });
        const body = s.parse(req.body);
        const cnpj = String(body.cnpj).replace(/\D/g, "");
        if (!(0, shared_1.validarCNPJ)(cnpj))
            return res.status(400).json({ error: "CNPJ inválido (14 dígitos)" });
        const conta = await (0, store_1.upsertCNPJ)({ cnpj, apelido: body.apelido, razaoSocial: body.razaoSocial, portalUser: body.portalUser, portalPass: body.portalPass, createdAt: new Date().toISOString() });
        res.status(201).json(conta);
    }
    catch (e) {
        next(e);
    }
});
router.post("/:cnpj/login", async (req, res, next) => {
    try {
        const cnpj = String(req.params.cnpj).replace(/\D/g, "");
        if (req.body?.portalUser || req.body?.portalPass)
            await (0, store_1.patchCNPJ)(cnpj, { portalUser: req.body.portalUser, portalPass: req.body.portalPass });
        const { loginWithCredentials, getCookiesHeader: getCk, isSessionValid: isValid } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
        const alreadyValid = await isValid(cnpj).catch(() => false);
        const okRaw = await loginWithCredentials(cnpj, req.body?.portalUser, req.body?.portalPass);
        const hasCk = !!(await getCk(cnpj));
        const stillValid = hasCk ? await isValid(cnpj).catch(() => false) : false;
        const ok = okRaw || alreadyValid || stillValid;
        res.status(ok ? 200 : 400).json({ ok, hasCookie: hasCk, cnpj, alreadyValid, stillValid });
    }
    catch (e) {
        next(e);
    }
});
router.get("/:cnpj/valid", async (req, res, next) => {
    try {
        const cnpj = String(req.params.cnpj).replace(/\D/g, "");
        const ok = await (0, portal_1.isSessionValid)(cnpj);
        const ck = await (0, portal_1.getCookiesHeader)(cnpj);
        res.json({ valid: ok, hasCookie: !!ck, cnpj });
    }
    catch (e) {
        next(e);
    }
});
router.patch("/:cnpj", async (req, res, next) => {
    try {
        const cnpj = String(req.params.cnpj).replace(/\D/g, "");
        const patch = {};
        if (req.body.apelido !== undefined)
            patch.apelido = req.body.apelido;
        if (req.body.razaoSocial !== undefined)
            patch.razaoSocial = req.body.razaoSocial;
        if (req.body.portalUser !== undefined)
            patch.portalUser = req.body.portalUser;
        if (req.body.portalPass !== undefined)
            patch.portalPass = req.body.portalPass;
        const updated = await (0, store_1.patchCNPJ)(cnpj, patch);
        if (!updated)
            return res.status(404).json({ error: "CNPJ não encontrado" });
        res.json(updated);
    }
    catch (e) {
        next(e);
    }
});
router.delete("/:cnpj", async (req, res, next) => {
    try {
        await (0, store_1.removeCNPJ)(String(req.params.cnpj).replace(/\D/g, ""));
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
router.delete("/:cnpj/session", async (req, res, next) => {
    try {
        const cnpj = String(req.params.cnpj).replace(/\D/g, "");
        await (0, portal_1.clearStorage)(cnpj);
        res.json({ ok: true, message: "Sessão limpa com sucesso. A próxima abertura forçará o login." });
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=cnpjs.js.map