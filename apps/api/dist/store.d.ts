import type { DisputaConfig } from "@licitabot/shared";
export interface CNPJConta {
    cnpj: string;
    apelido?: string;
    razaoSocial?: string;
    portalUser?: string;
    portalPass?: string;
    createdAt: string;
    updatedAt?: string;
}
export declare function setDisputaAuto(id: string, on: boolean): Promise<void>;
export declare function getDisputaAuto(id: string): Promise<boolean>;
export declare function listAutos(): Promise<Map<string, boolean>>;
export declare function listCNPJs(): Promise<CNPJConta[]>;
export declare function getCNPJ(cnpj: string): Promise<CNPJConta | null>;
export declare function upsertCNPJ(conta: CNPJConta): Promise<CNPJConta>;
export declare function patchCNPJ(cnpj: string, patch: Partial<CNPJConta>): Promise<CNPJConta | null>;
export declare function removeCNPJ(cnpj: string): Promise<void>;
export declare function deleteDisputa(id: string): Promise<void>;
export declare function listDisputas(): Promise<DisputaConfig[]>;
export declare function getDisputa(id: string): Promise<DisputaConfig | undefined>;
export declare function saveDisputa(d: DisputaConfig): Promise<DisputaConfig>;
export declare function panic(): Promise<{
    success: boolean;
    message: string;
}>;
export interface EditalFavorito {
    id: string;
    numero?: string;
    objeto?: string;
    orgao?: string;
    uf?: string;
    municipio?: string;
    dataAbertura?: string;
    modo?: string;
    url?: string;
}
export declare function listFavoritos(): Promise<EditalFavorito[]>;
export declare function saveFavorito(e: EditalFavorito): Promise<EditalFavorito>;
export declare function removeFavorito(id: string): Promise<void>;
//# sourceMappingURL=store.d.ts.map