import type { EditalResumo, LoteResumo, FiltroEditais } from "@licitabot/shared";
export declare function buscarEditais(filtro?: FiltroEditais, cnpj?: string): Promise<{
    data: EditalResumo[];
    total: number;
    source: "portal";
}>;
export declare function obterEdital(id: string): Promise<EditalResumo | null>;
export declare function obterLotes(editalId: string, cnpjOverride?: string): Promise<LoteResumo[]>;
export declare function buscarEditaisViaPlaywright(page: import("playwright").Page, filtro?: FiltroEditais): Promise<{
    data: EditalResumo[];
    total: number;
}>;
//# sourceMappingURL=monitor.d.ts.map