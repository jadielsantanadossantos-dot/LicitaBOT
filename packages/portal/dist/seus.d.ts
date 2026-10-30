export interface ProcessoParticipando {
    id: string;
    numero: string;
    orgao: string;
    objeto: string;
    tipo: string;
    abertura: string;
    dataAberturaISO: string;
    situacao: string;
}
/** Lista "Seus Processos" (/4/SeusPregoes/) — pregões que o CNPJ participa. */
export declare function buscarSeusPregoes(cnpj: string, opts?: {
    situacao?: string;
    q?: string;
    maxPaginas?: number;
}): Promise<{
    data: ProcessoParticipando[];
    total: number;
}>;
//# sourceMappingURL=seus.d.ts.map