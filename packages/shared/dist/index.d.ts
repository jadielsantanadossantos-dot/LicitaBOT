export type CNPJ = string;
export type ModoDisputa = "ABERTO" | "ABERTO_FECHADO" | "FECHADO";
export type Estrategia = "cobrir_minimo" | "agressivo" | "conservador" | "sniper";
export interface ItemConfig {
    id: string;
    loteId: string;
    descricao?: string;
    piso: number | null;
    decremento: number;
    intervaloMinimo?: number;
    estrategia: Estrategia;
    ativo: boolean;
    posicaoAlvo: number;
}
export interface DisputaConfig {
    id: string;
    processoId: string;
    editalId?: string;
    cnpj: CNPJ;
    modo: ModoDisputa;
    dataHora: string;
    status: "rascunho" | "agendada" | "em_andamento" | "encerrada";
    exequibilidade?: number;
    itens: ItemConfig[];
    createdAt: string;
    updatedAt: string;
}
export interface Lance {
    loteId: string;
    valor: number;
    timestampServidor?: number;
    autor?: string;
}
export interface RankingEstado {
    posicao: number | null;
    posicaoRaw: string | null;
    estaVencendo: boolean | null;
    valores: number[];
    qtdLances: number | null;
    autorMelhor?: "eu" | "concorrente" | null;
}
export interface EstadoLote {
    loteId: string;
    menorLance: number | null;
    meuLance: number | null;
    tempoRestanteMs: number | null;
    fase: "ABERTA" | "RAND" | "FECHADA" | "ENCERRADA" | "SUSPENSA";
    modo: ModoDisputa;
    ranking: RankingEstado | null;
}
export interface EditalResumo {
    id: string;
    numero: string;
    objeto: string;
    orgao: string;
    uf: string;
    municipio?: string;
    dataAbertura: string;
    modo: ModoDisputa;
    valorEstimado?: number;
    url?: string;
}
export interface LoteResumo {
    id: string;
    editalId: string;
    numero: number;
    descricao: string;
    quantidade?: number;
    unidade?: string;
    valorReferencia?: number;
    intervaloMinimo?: number;
}
export interface FiltroEditais {
    q?: string;
    numero?: string;
    cidade?: string;
    objeto?: string;
    uf?: string;
    modo?: ModoDisputa;
    page?: number;
    pageSize?: number;
    dataDe?: string;
    dataAte?: string;
    dataAbertura?: string;
}
export declare function validarDisputa(d: Partial<DisputaConfig>): string[];
export declare function validarCNPJ(cnpj: string): boolean;
//# sourceMappingURL=index.d.ts.map