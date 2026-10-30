"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const config_1 = require("../config");
class TelegramService {
    static token = config_1.config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    static chatId = config_1.config.telegramChatId || process.env.TELEGRAM_CHAT_ID;
    static async sendMessage(text) {
        if (!this.token || !this.chatId) {
            console.log("[Telegram] Configura��es ausentes (token/chatId). Mensagem ignorada.");
            return;
        }
        try {
            const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: text,
                    parse_mode: "HTML",
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                console.error(`[Telegram] Erro ao enviar mensagem: ${res.status} - ${err}`);
            }
        }
        catch (e) {
            console.error(`[Telegram] Exception: ${e.message}`);
        }
    }
    static async sendAlert(title, message) {
        await this.sendMessage(`<b>?? ${title}</b>\n\n${message}`);
    }
    static async sendInfo(title, message) {
        await this.sendMessage(`<b>?? ${title}</b>\n\n${message}`);
    }
}
exports.TelegramService = TelegramService;
//# sourceMappingURL=telegram.js.map