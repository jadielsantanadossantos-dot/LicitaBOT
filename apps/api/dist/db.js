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
exports.pool = void 0;
exports.query = query;
exports.setupDb = setupDb;
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
for (const p of [path_1.default.resolve(".env"), path_1.default.resolve("../../.env"), path_1.default.resolve(process.cwd(), ".env"), path_1.default.resolve("apps/api/.env")]) {
    if (fs_1.default.existsSync(p)) {
        dotenv.config({ path: p });
        break;
    }
}
const pg_1 = require("pg");
const cs = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
if (!cs)
    throw new Error("DATABASE_URL obrigatoria - configure .env (ex: postgresql://postgres:licita@127.0.0.1:5432/licitabot)");
exports.pool = new pg_1.Pool({
    connectionString: cs,
    ssl: cs.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
exports.pool.on("error", (e) => console.error("[db] pool", e.message));
async function query(text, params) {
    const r = await exports.pool.query(text, params);
    return { rows: r.rows, rowCount: r.rowCount ?? 0 };
}
async function setupDb() {
    await query(`ALTER TABLE disputas ADD COLUMN IF NOT EXISTS exequibilidade NUMERIC(5,2) NOT NULL DEFAULT 50`).catch(() => { });
    await query(`ALTER TABLE disputas ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT false`).catch(() => { });
    await query(`ALTER TABLE itens ADD COLUMN IF NOT EXISTS posicao_alvo INTEGER NOT NULL DEFAULT 1`).catch(() => { });
    await query(`ALTER TABLE itens ALTER COLUMN piso DROP NOT NULL`).catch(() => { });
    await query(`
    CREATE TABLE IF NOT EXISTS edital_favoritos (
      id TEXT PRIMARY KEY,
      numero TEXT,
      objeto TEXT,
      orgao TEXT,
      uf TEXT,
      municipio TEXT,
      data_abertura TEXT,
      modo TEXT,
      url TEXT,
      edital_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).catch(() => { });
    await query(`
    CREATE TABLE IF NOT EXISTS lance_logs (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ DEFAULT now(),
      licitacao_id TEXT,
      item_id TEXT,
      valor NUMERIC,
      cnpj TEXT,
      ok BOOLEAN,
      mensagem TEXT,
      raw_response TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lance_logs_cnpj ON lance_logs(cnpj);
    CREATE INDEX IF NOT EXISTS idx_lance_logs_ts ON lance_logs(ts);
  `);
}
//# sourceMappingURL=db.js.map