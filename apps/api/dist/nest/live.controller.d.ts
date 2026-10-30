export declare class LiveExtraController {
    live(id: string): {
        itens: import("@licitabot/portal").ItemSessao[];
        chat: import("@licitabot/portal").ChatMsg[];
        status: string;
        hora: string | null;
        updatedAt: string;
        error?: string;
        watching: boolean;
    } | {
        watching: boolean;
        itens: never[];
        chat: never[];
        status: string;
        hora: null;
        updatedAt: null;
    };
    watch(id: string, b: any, q: any): Promise<{
        ok: boolean;
        watching: string;
        cnpj: string;
    }>;
    unwatch(id: string): {
        ok: boolean;
    };
    lance(b: any): Promise<{
        ok: boolean;
        mensagem: string;
        raw: string;
    }>;
    log(): {
        ts: string;
        licitacaoId: string;
        itemId: string;
        valor: number;
        cnpj: string;
        ok: boolean;
        msg: string;
    }[];
    agenda(): Promise<{
        id: string;
        processoId: string;
        cnpj: string;
        dataHora: string;
        status: "rascunho" | "agendada" | "em_andamento" | "encerrada";
        msAte: number;
        itens: number;
        exequibilidade: any;
    }[]>;
    hora(q: any): Promise<{
        hora: string | null;
        local: string;
    }>;
    sessao(q: any): Promise<{
        itens: import("@licitabot/portal").ItemSessao[];
        htmlLen: number;
    }>;
    valid(q: any): Promise<{
        valid: boolean;
        hasCookie: boolean;
    }>;
    ranking(lic: string, item: string, q: any): Promise<import("@licitabot/portal").RankingResultado>;
    pregoes(q: any): Promise<{
        data: import("@licitabot/shared").EditalResumo[];
        total: number;
        source: "portal";
    }>;
}
//# sourceMappingURL=live.controller.d.ts.map