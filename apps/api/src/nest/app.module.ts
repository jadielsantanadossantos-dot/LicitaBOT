import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { CnpjsController } from "./cnpjs.controller";
import { EditaisController } from "./editais.controller";
import { DisputasController } from "./disputas.controller";
import { LiveExtraController } from "./live.controller";
@Module({ controllers: [HealthController, CnpjsController, EditaisController, DisputasController, LiveExtraController] })
export class AppModule {}
