export declare class EditaisController {
    list(q: any): Promise<{
        data: import("@licitabot/shared").EditalResumo[];
        total: number;
        source: "portal";
    }>;
    lotes(id: string, q: any): Promise<import("@licitabot/shared").LoteResumo[]>;
    arquivos(id: string, q: any): Promise<{
        id: string;
        arquivos: {
            href: string;
            label: string;
        }[];
        portalUrl: string;
    }>;
    one(id: string): Promise<import("@licitabot/shared").EditalResumo>;
}
//# sourceMappingURL=editais.controller.d.ts.map