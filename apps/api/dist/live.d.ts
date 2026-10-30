import { type ItemSessao, type ChatMsg } from "@licitabot/portal";
export declare const liveState: Map<string, {
    itens: ItemSessao[];
    chat: ChatMsg[];
    status: string;
    hora: string | null;
    updatedAt: string;
    error?: string;
}>;
export declare const lanceLog: {
    ts: string;
    licitacaoId: string;
    itemId: string;
    valor: number;
    cnpj: string;
    ok: boolean;
    msg: string;
}[];
export declare function liveKey(licitacaoId: string, cnpj: string): string;
export declare function isLanceCooldown(cnpj: string, itemId: string): boolean;
export declare function sessaoBloqueadaAte(cnpj: string): number;
export declare function isWafAtivo(cnpj: string): boolean;
export declare function ensureSession(cnpj: string): Promise<boolean>;
export declare function tickLive(licitacaoId: string, cnpj: string): Promise<void>;
export declare function watchLicitacao(licitacaoId: string, cnpj: string): void;
export declare function unwatchLicitacao(licitacaoId: string, cnpj?: string): void;
export declare function enviarLance(licitacaoId: string, cnpj: string, itemId: string, valor: number): Promise<{
    ok: boolean;
    mensagem: string;
    raw: string;
}>;
export declare function getLive(licitacaoId: string, cnpj?: string): {
    itens: ItemSessao[];
    chat: ChatMsg[];
    status: string;
    hora: string | null;
    updatedAt: string;
    error?: string;
} | null;
//# sourceMappingURL=live.d.ts.map