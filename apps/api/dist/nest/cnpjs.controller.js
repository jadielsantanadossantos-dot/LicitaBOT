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
exports.CnpjsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const shared_1 = require("@licitabot/shared");
const store_1 = require("../store");
const portal_1 = require("@licitabot/portal");
let CnpjsController = class CnpjsController {
    list() { return (0, store_1.listCNPJs)(); }
    async create(body) {
        const s = zod_1.z.object({ cnpj: zod_1.z.string(), apelido: zod_1.z.string().optional(), razaoSocial: zod_1.z.string().optional(), portalUser: zod_1.z.string().optional(), portalPass: zod_1.z.string().optional() });
        const b = s.parse(body);
        const cnpj = String(b.cnpj).replace(/\D/g, "");
        if (!(0, shared_1.validarCNPJ)(cnpj))
            throw Object.assign(new Error("CNPJ inválido"), { status: 400 });
        return (0, store_1.upsertCNPJ)({ cnpj, apelido: b.apelido, razaoSocial: b.razaoSocial, portalUser: b.portalUser, portalPass: b.portalPass, createdAt: new Date().toISOString() });
    }
    async login(cnpj, body) {
        const id = String(cnpj).replace(/\D/g, "");
        const { loginWithCredentials, getCookiesHeader: getCk } = await Promise.resolve().then(() => __importStar(require("@licitabot/portal")));
        const ok = await loginWithCredentials(id, body?.portalUser, body?.portalPass);
        if (body?.portalUser || body?.portalPass)
            await (0, store_1.patchCNPJ)(id, { portalUser: body.portalUser, portalPass: body.portalPass });
        return { ok, hasCookie: !!(await getCk(id)), cnpj: id };
    }
    async valid(cnpj) {
        const id = String(cnpj).replace(/\D/g, "");
        return { valid: await (0, portal_1.isSessionValid)(id), hasCookie: !!(await (0, portal_1.getCookiesHeader)(id)), cnpj: id };
    }
    async patch(cnpj, body) {
        const id = String(cnpj).replace(/\D/g, "");
        const patch = {};
        if (body.apelido !== undefined)
            patch.apelido = body.apelido;
        if (body.razaoSocial !== undefined)
            patch.razaoSocial = body.razaoSocial;
        if (body.portalUser !== undefined)
            patch.portalUser = body.portalUser;
        if (body.portalPass !== undefined)
            patch.portalPass = body.portalPass;
        const u = await (0, store_1.patchCNPJ)(id, patch);
        if (!u)
            throw Object.assign(new Error("CNPJ não encontrado"), { status: 404 });
        return u;
    }
    async del(cnpj) { await (0, store_1.removeCNPJ)(String(cnpj).replace(/\D/g, "")); return { ok: true }; }
};
exports.CnpjsController = CnpjsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CnpjsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CnpjsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(":cnpj/login"),
    __param(0, (0, common_1.Param)("cnpj")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CnpjsController.prototype, "login", null);
__decorate([
    (0, common_1.Get)(":cnpj/valid"),
    __param(0, (0, common_1.Param)("cnpj")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CnpjsController.prototype, "valid", null);
__decorate([
    (0, common_1.Patch)(":cnpj"),
    __param(0, (0, common_1.Param)("cnpj")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CnpjsController.prototype, "patch", null);
__decorate([
    (0, common_1.Delete)(":cnpj"),
    __param(0, (0, common_1.Param)("cnpj")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CnpjsController.prototype, "del", null);
exports.CnpjsController = CnpjsController = __decorate([
    (0, common_1.Controller)("api/cnpjs")
], CnpjsController);
//# sourceMappingURL=cnpjs.controller.js.map