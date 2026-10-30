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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveExtraController = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../store");
const live_1 = require("../live");
const portal_1 = require("@licitabot/portal");
const portal_2 = require("@licitabot/portal");
const scheduler_1 = require("../scheduler");
let LiveExtraController = class LiveExtraController {
    live(id) { const q = (0, live_1.getLive)(id); return q ? { watching: true, ...q } : { watching: false, itens: [], chat: [], status: "", hora: null, updatedAt: null }; }
    async watch(id, b, q) { const cnpj = String(b?.cnpj || q.cnpj || "").replace(/\D/g, "") || (await (0, store_1.listCNPJs)())[0]?.cnpj || ""; if (!cnpj)
        throw Object.assign(new Error("cnpj obrigatório"), { status: 400 }); (0, live_1.watchLicitacao)(id, cnpj); return { ok: true, watching: id, cnpj }; }
    unwatch(id) { (0, live_1.unwatchLicitacao)(id); return { ok: true }; }
    async lance(b) { const licitacaoId = String(b.licitacaoId || b.processoId || ""); const itemId = String(b.itemId || b.loteId || ""); const valor = Number(b.valor); const cnpj = String(b.cnpj || "").replace(/\D/g, ""); if (!licitacaoId || !itemId || !valor || !cnpj)
        throw Object.assign(new Error("licitacaoId,itemId,valor,cnpj obrigatórios"), { status: 400 }); const r = await (0, live_1.enviarLance)(licitacaoId, cnpj, itemId, valor); return r; }
    log() { return live_1.lanceLog.slice(0, 50); }
    agenda() { return (0, scheduler_1.agendaSnapshot)(); }
    async hora(q) { const cnpj = String(q.cnpj || "") || (await (0, store_1.listCNPJs)())[0]?.cnpj || undefined; const h = cnpj ? await (0, portal_1.obterHoraServidor)(cnpj) : await (0, portal_1.obterHoraServidor)(); return { hora: h ? h.toISOString() : null, local: new Date().toISOString() }; }
    async sessao(q) { const id = String(q.id || ""); const cnpj = String(q.cnpj || "") || (await (0, store_1.listCNPJs)())[0]?.cnpj || ""; if (!id || !cnpj)
        throw Object.assign(new Error("id e cnpj obrigatórios"), { status: 400 }); const html = await (0, portal_1.obterHtmlAba)(cnpj, id, 0, 1, 1); return { itens: (0, portal_1.parseItens)(html), htmlLen: html.length }; }
    async valid(q) { const cnpj = String(q.cnpj || "") || (await (0, store_1.listCNPJs)())[0]?.cnpj || ""; if (!cnpj)
        throw Object.assign(new Error("cnpj obrigatório"), { status: 400 }); return { valid: await (0, portal_1.isSessionValid)(cnpj), hasCookie: !!(await (0, portal_1.getCookiesHeader)(cnpj)) }; }
    async ranking(lic, item, q) { const cnpj = String(q.cnpj || "") || (await (0, store_1.listCNPJs)())[0]?.cnpj || ""; if (!lic || !item || !cnpj)
        throw Object.assign(new Error("licitacaoId,itemId,cnpj obrigatórios"), { status: 400 }); const { fetchRanking } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal"))); return fetchRanking(cnpj, lic, item); }
    async pregoes(q) { const cnpj = String(q.cnpj || "") || (await (0, store_1.listCNPJs)())[0]?.cnpj || ""; if (!cnpj)
        throw Object.assign(new Error("nenhum CNPJ"), { status: 400 }); return (0, portal_2.buscarEditais)({ q: q.q, uf: q.uf, page: Number(q.pagina || 1), pageSize: 50, dataDe: q.dataAbertura || q.dataDe, dataAte: q.dataAbertura || q.dataDe }, cnpj); }
};
exports.LiveExtraController = LiveExtraController;
__decorate([
    (0, common_1.Get)("api/live/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiveExtraController.prototype, "live", null);
__decorate([
    (0, common_1.Post)("api/live/:id/watch"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "watch", null);
__decorate([
    (0, common_1.Post)("api/live/:id/unwatch"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiveExtraController.prototype, "unwatch", null);
__decorate([
    (0, common_1.Post)("api/lance"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "lance", null);
__decorate([
    (0, common_1.Get)("api/lances/log"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiveExtraController.prototype, "log", null);
__decorate([
    (0, common_1.Get)("api/agenda"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiveExtraController.prototype, "agenda", null);
__decorate([
    (0, common_1.Get)("api/hora"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "hora", null);
__decorate([
    (0, common_1.Get)("api/sessao"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "sessao", null);
__decorate([
    (0, common_1.Get)("api/sessao/valid"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "valid", null);
__decorate([
    (0, common_1.Get)("api/ranking/:licitacaoId/:itemId"),
    __param(0, (0, common_1.Param)("licitacaoId")),
    __param(1, (0, common_1.Param)("itemId")),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "ranking", null);
__decorate([
    (0, common_1.Get)("api/pregoes"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LiveExtraController.prototype, "pregoes", null);
exports.LiveExtraController = LiveExtraController = __decorate([
    (0, common_1.Controller)()
], LiveExtraController);
//# sourceMappingURL=live.controller.js.map