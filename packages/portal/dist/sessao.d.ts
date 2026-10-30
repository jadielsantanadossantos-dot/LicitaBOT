import type { Page } from "playwright";
export interface ChatMsg {
    id: string;
    data: string;
    hora: string;
    nome: string;
    mensagem: string;
}
export interface ItemSessao {
    id: string;
    numero: string;
    descricao: string;
    referencia: number | null;
    melhorLance: number | null;
    situacao: string;
    tempo?: string;
    temFormLance: boolean;
    formAction?: string;
    posicaoRaw?: string | null;
    posicao?: number | null;
    estaVencendo?: boolean | null;
    rankingUrl?: string | null;
    historicoUrl?: string | null;
    qtdLances?: number | null;
    autorMelhor?: "eu" | "concorrente" | null;
    horaFechamento?: string | null;
    meuLance?: number | null;
}
export interface RankingEntry {
    pos: number;
    valor: number;
    fornecedor?: string;
}
export interface RankingResultado {
    posicoes: RankingEntry[];
    raw: string;
}
export declare function parsePosicaoNumero(raw: string | null | undefined): number | null;
export declare function obterHoraServidor(cnpj?: string): Promise<Date | null>;
export declare function obterChat(cnpj: string, licitacaoId: string | number, ultimoId?: number): Promise<{
    mensagens: ChatMsg[];
    permissaoMensagem?: string;
}>;
export declare function obterStatus(cnpj: string, licitacaoId: string | number): Promise<string>;
export declare function obterHtmlAba(cnpj: string, licitacaoId: string | number, param?: number | string, pagina?: number, paginaItemLote?: number): Promise<string>;
export declare function parseItens(html: string): ItemSessao[];
export declare function fetchRanking(cnpj: string, licitacaoId: string | number, itemId: string | number, opts?: {
    maxAgeMs?: number;
}): Promise<RankingResultado>;
export declare function fetchHistorico(cnpj: string, licitacaoId: string | number, itemId: string | number): Promise<{
    lances: {
        valor: number;
        data?: string;
    }[];
    raw: string;
}>;
/** Respostas do portal que PARECEM ok mas na verdade rejeitaram o lance. */
export declare function isLanceRejeitado(t: string): boolean;
export declare function enviarLanceViaFetch(cnpj: string, licitacaoId: string | number, itemId: string, valor: number): Promise<{
    ok: boolean;
    mensagem: string;
    raw: string;
}>;
export declare function enviarLanceViaDOM(page: Page, itemId: string, valor: number): Promise<{
    ok: boolean;
    mensagem: string;
}>;
export declare function attachSessaoPolling(page: Page, licitacaoId: string | number, cbs: {
    onChat?: (m: ChatMsg[]) => void;
    onStatus?: (s: string) => void;
    onItens?: (itens: ItemSessao[]) => void;
    onHora?: (d: Date) => void;
}): Promise<void>;
//# sourceMappingURL=sessao.d.ts.map