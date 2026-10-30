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
exports.EditaisController = void 0;
const common_1 = require("@nestjs/common");
const portal_1 = require("@licitabot/portal");
const store_1 = require("../store");
let EditaisController = class EditaisController {
    async list(q) {
        const cnpjQ = q.cnpj || undefined;
        return (0, portal_1.buscarEditais)({ q: q.q, numero: q.numero, cidade: q.cidade, objeto: q.objeto, uf: q.uf, modo: q.modo, page: Number(q.page || 1), pageSize: Number(q.pageSize || 20), dataAbertura: q.dataAbertura || q.data, dataDe: q.dataDe || q.dataAbertura, dataAte: q.dataAte || q.dataAbertura }, cnpjQ ? String(cnpjQ).replace(/\D/g, "") : undefined);
    }
    async lotes(id, q) {
        const qc = q.cnpj || (await (0, store_1.listCNPJs)())[0]?.cnpj;
        return (0, portal_1.obterLotes)(id, qc || undefined);
    }
    async arquivos(id, q) {
        const cnpj = q.cnpj || (await (0, store_1.listCNPJs)())[0]?.cnpj || "";
        const { fetchWithJar } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
        const BASE_OP = "https://operacao.portaldecompraspublicas.com.br";
        const r = await fetchWithJar(cnpj, `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}`, { headers: { Accept: "text/html" } });
        const buf = await r.arrayBuffer();
        const ct = r.headers.get("content-type") || "";
        const html = ct.includes("iso-8859") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf).includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf);
        const links = [...html.matchAll(/href="([^"]*\/4\/Pregoes\/Download[^"]*)"/gi)].map(x => `${BASE_OP}${x[1].replace(/&amp;/g, "&")}`);
        return { id, arquivos: [...new Set(links)].map(href => ({ href, label: "Download edital" })), portalUrl: `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${id}` };
    }
    async one(id) {
        const e = await (0, portal_1.obterEdital)(id);
        if (!e)
            throw Object.assign(new Error("Edital não encontrado"), { status: 404 });
        return e;
    }
};
exports.EditaisController = EditaisController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EditaisController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id/lotes"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EditaisController.prototype, "lotes", null);
__decorate([
    (0, common_1.Get)(":id/arquivos"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EditaisController.prototype, "arquivos", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EditaisController.prototype, "one", null);
exports.EditaisController = EditaisController = __decorate([
    (0, common_1.Controller)("api/editais")
], EditaisController);
//# sourceMappingURL=editais.controller.js.map