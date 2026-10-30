export declare class DisputasController {
    getAuto(id: string): Promise<{
        id: string;
        auto: boolean;
    }>;
    setAuto(id: string, b: any): Promise<{
        id: string;
        auto: boolean;
    }>;
    patchItem(id: string, loteId: string, b: any): Promise<import("@licitabot/shared").DisputaConfig>;
    list(): Promise<import("@licitabot/shared").DisputaConfig[]>;
    create(b: any): Promise<any>;
    one(id: string): Promise<import("@licitabot/shared").DisputaConfig>;
    upd(id: string, b: any): Promise<any>;
    del(id: string): Promise<{
        ok: boolean;
    }>;
}
//# sourceMappingURL=disputas.controller.d.ts.map