export declare class CnpjsController {
    list(): Promise<import("../store").CNPJConta[]>;
    create(body: any): Promise<import("../store").CNPJConta>;
    login(cnpj: string, body: any): Promise<{
        ok: boolean;
        hasCookie: boolean;
        cnpj: string;
    }>;
    valid(cnpj: string): Promise<{
        valid: boolean;
        hasCookie: boolean;
        cnpj: string;
    }>;
    patch(cnpj: string, body: any): Promise<import("../store").CNPJConta>;
    del(cnpj: string): Promise<{
        ok: boolean;
    }>;
}
//# sourceMappingURL=cnpjs.controller.d.ts.map