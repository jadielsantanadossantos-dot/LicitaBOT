import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { z } from "zod";
for(const p of [path.resolve(".env"), path.resolve("../../.env"), path.resolve(process.cwd(), ".env")]){
  if(fs.existsSync(p)){ dotenv.config({ path:p }); break; }
}
const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  PORTAL_CNPJ: z.string().default("32977510000100"),
  REDIS_URL: z.string().optional().default(""),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  NODE_ENV: z.string().optional().default("development"),
});
const parsed = envSchema.safeParse(process.env);
if(!parsed.success) console.warn("[config] env inválido", parsed.error.flatten());
export const config = {
  port: Number(process.env.PORT || 3001),
  // Agora o defaultCnpj é um getter ou mantido para compatibilidade, mas idealmente
  // os serviços devem iterar sobre todos os CNPJs ativos do banco.
  defaultCnpj: (process.env.PORTAL_CNPJ || "24483944000125").replace(/\D/g,""),
  liveIntervalMs: 3500,
  engineIntervalMs: 1500,
  redisUrl: process.env.REDIS_URL || "",
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "") === "production",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
} as any;
