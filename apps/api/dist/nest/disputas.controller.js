"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputasController = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@licitabot/shared");
const store_1 = require("../store");
let DisputasController = class DisputasController {
    getAuto(id) { return (0, store_1.getDisputaAuto)(id).then(auto => ({ id, auto })); }
    async setAuto(id, b) { await (0, store_1.setDisputaAuto)(id, !!b?.on); return { id, auto: !!b?.on }; }
    async patchItem(id, loteId, b) {
        const d = await (0, store_1.getDisputa)(id);
        if (!d)
            throw Object.assign(new Error("Disputa não encontrada"), { status: 404 });
        const norm = (s) => { const t = String(s ?? "").trim(); const n = t.replace(/^0+/, ""); return n === "" ? "0" : n; };
        const idx = d.itens.findIndex((x) => x.loteId === loteId || x.id === loteId || norm(x.loteId) === norm(loteId));
        if (idx < 0)
            throw Object.assign(new Error("Item não encontrado"), { status: 404 });
        let touched = false;
        if (b?.posicaoAlvo !== undefined) {
            const pa = Number(b?.posicaoAlvo);
            if (!Number.isInteger(pa) || pa < 1 || pa > 10)
                throw Object.assign(new Error("posicaoAlvo 1..10"), { status: 400 });
            d.itens[idx].posicaoAlvo = pa;
            touched = true;
        }
        if (b?.ativo !== undefined) {
            d.itens[idx].ativo = !!b.ativo;
            touched = true;
        }
        if (b?.decremento !== undefined) {
            const dec = Number(String(b.decremento).replace(",", "."));
            if (!Number.isFinite(dec) || dec <= 0)
                throw Object.assign(new Error("decremento deve ser >0"), { status: 400 });
            d.itens[idx].decremento = dec;
            touched = true;
        }
        if (b?.estrategia !== undefined) {
            const est = String(b.estrategia);
            if (!["cobrir_minimo", "agressivo", "conservador", "sniper"].includes(est))
                throw Object.assign(new Error("estrategia inválida"), { status: 400 });
            d.itens[idx].estrategia = est;
            touched = true;
        }
        if (!touched)
            throw Object.assign(new Error("informe posicaoAlvo, ativo, decremento e/ou estrategia"), { status: 400 });
        d.updatedAt = new Date().toISOString();
        const errs = (0, shared_1.validarDisputa)(d);
        if (errs.length)
            throw Object.assign(new Error(JSON.stringify(errs)), { status: 400 });
        await (0, store_1.saveDisputa)(d);
        return d;
    }
    list() { return (0, store_1.listDisputas)(); }
    async create(b) {
        const now = new Date().toISOString();
        const d = { id: b.id || `disp-${Date.now()}`, processoId: b.processoId, editalId: b.editalId, cnpj: String(b.cnpj || "").replace(/\D/g, ""), modo: b.modo, dataHora: b.dataHora, status: b.status || "rascunho", itens: b.itens || [], createdAt: now, updatedAt: now };
        const errs = (0, shared_1.validarDisputa)(d);
        if (errs.length)
            throw Object.assign(new Error(JSON.stringify(errs)), { status: 400 });
        if (!(0, shared_1.validarCNPJ)(d.cnpj))
            throw Object.assign(new Error("CNPJ inválido"), { status: 400 });
        await (0, store_1.saveDisputa)(d);
        return d;
    }
    async one(id) { const d = await (0, store_1.getDisputa)(id); if (!d)
        throw Object.assign(new Error("Disputa não encontrada"), { status: 404 }); return d; }
    async upd(id, b) {
        const ex = await (0, store_1.getDisputa)(id);
        if (!ex)
            throw Object.assign(new Error("Disputa não encontrada"), { status: 404 });
        const up = { ...ex, ...b, id, updatedAt: new Date().toISOString() };
        const errs = (0, shared_1.validarDisputa)(up);
        if (errs.length)
            throw Object.assign(new Error(JSON.stringify(errs)), { status: 400 });
        await (0, store_1.saveDisputa)(up);
        return up;
    }
    async del(id) { await (0, store_1.deleteDisputa)(id); return { ok: true }; }
};
exports.DisputasController = DisputasController;
__decorate([
    (0, common_1.Get)(":id/auto"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DisputasController.prototype, "getAuto", null);
__decorate([
    (0, common_1.Post)(":id/auto"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisputasController.prototype, "setAuto", null);
__decorate([
    (0, common_1.Patch)(":id/itens/:loteId"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("loteId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DisputasController.prototype, "patchItem", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DisputasController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DisputasController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DisputasController.prototype, "one", null);
__decorate([
    (0, common_1.Put)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisputasController.prototype, "upd", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DisputasController.prototype, "del", null);
exports.DisputasController = DisputasController = __decorate([
    (0, common_1.Controller)("api/disputas")
], DisputasController);
//# sourceMappingURL=disputas.controller.js.map