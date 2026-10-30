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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const zod_1 = require("zod");
for (const p of [path_1.default.resolve(".env"), path_1.default.resolve("../../.env"), path_1.default.resolve(process.cwd(), ".env")]) {
    if (fs_1.default.existsSync(p)) {
        dotenv.config({ path: p });
        break;
    }
}
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3001),
    PORTAL_CNPJ: zod_1.z.string().default("32977510000100"),
    REDIS_URL: zod_1.z.string().optional().default(""),
    DATABASE_URL: zod_1.z.string().optional(),
    DIRECT_URL: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.string().optional().default("development"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success)
    console.warn("[config] env inválido", parsed.error.flatten());
exports.config = {
    port: Number(process.env.PORT || 3001),
    defaultCnpj: (process.env.PORTAL_CNPJ || "32977510000100").replace(/\D/g, ""),
    liveIntervalMs: 3500,
    engineIntervalMs: 1500,
    redisUrl: process.env.REDIS_URL || "",
    nodeEnv: process.env.NODE_ENV || "development",
    isProd: (process.env.NODE_ENV || "") === "production",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
};
//# sourceMappingURL=config.js.map