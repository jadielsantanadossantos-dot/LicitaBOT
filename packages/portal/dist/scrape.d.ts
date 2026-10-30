export declare function buscarPregoesReal(cnpj: string, f?: {
    q?: string;
    orgao?: string;
    uf?: string;
    pagina?: number;
    pageSize?: number;
    dataDe?: string;
    dataAte?: string;
    dataAbertura?: string;
}): Promise<{
    data: {
        id: string;
        numero: string;
        orgao: string;
        objeto: string;
        tipo: string;
        abertura: string;
        dataAberturaISO: string;
        situacao: string;
        uf: string;
    }[];
    total: number;
    htmlLen: number;
} | null>;
//# sourceMappingURL=scrape.d.ts.map