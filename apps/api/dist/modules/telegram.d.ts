export declare class TelegramService {
    private static token;
    private static chatId;
    static sendMessage(text: string): Promise<void>;
    static sendAlert(title: string, message: string): Promise<void>;
    static sendInfo(title: string, message: string): Promise<void>;
}
//# sourceMappingURL=telegram.d.ts.map