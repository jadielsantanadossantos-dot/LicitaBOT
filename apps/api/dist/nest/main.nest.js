"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({ origin: "*" });
    await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
    console.log(`Nest on ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.nest.js.map