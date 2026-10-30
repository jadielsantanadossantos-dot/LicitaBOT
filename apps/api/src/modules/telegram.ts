import { config } from "../config";

export class TelegramService {
  private static token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  private static chatId = config.telegramChatId || process.env.TELEGRAM_CHAT_ID;

  static async sendMessage(text: string) {
    if (!this.token || !this.chatId) {
      console.log("[Telegram] Configurações ausentes (token/chatId). Mensagem ignorada.");
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
    } catch (e: any) {
      console.error(`[Telegram] Exception: ${e.message}`);
    }
  }

  static async sendAlert(title: string, message: string) {
    await this.sendMessage(`<b>?? ${title}</b>\n\n${message}`);
  }

  static async sendInfo(title: string, message: string) {
    await this.sendMessage(`<b>?? ${title}</b>\n\n${message}`);
  }
}

