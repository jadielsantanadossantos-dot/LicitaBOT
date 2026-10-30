"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const health_controller_1 = require("./health.controller");
const cnpjs_controller_1 = require("./cnpjs.controller");
const editais_controller_1 = require("./editais.controller");
const disputas_controller_1 = require("./disputas.controller");
const live_controller_1 = require("./live.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({ controllers: [health_controller_1.HealthController, cnpjs_controller_1.CnpjsController, editais_controller_1.EditaisController, disputas_controller_1.DisputasController, live_controller_1.LiveExtraController] })
], AppModule);
//# sourceMappingURL=app.module.js.map