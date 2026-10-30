import { type BrowserContext } from "playwright";
export declare function storagePathFor(cnpj: string): string;
export declare function ensureStorageDir(): Promise<void>;
export declare function loadStorage(cnpj: string): any | null;
export declare function saveStorage(cnpj: string, data: any): void;
export declare function clearStorage(cnpj: string): void;
export declare function getCookiesHeader(cnpj: string): Promise<string>;
export declare function getCookiesHeaderForUrl(cnpj: string, _url: string): string;
export declare function updateCookiesFromHeaders(cnpj: string, headers: Headers): void;
export declare function fetchWithJar(cnpj: string, url: string, init?: RequestInit): Promise<Response>;
export declare function createContextForCNPJ(cnpj: string, headed?: boolean): Promise<BrowserContext>;
export declare function loginWithCredentials(cnpj: string, username?: string, password?: string): Promise<boolean>;
export declare function loginIfNeeded(ctx: BrowserContext, username: string, password: string, cnpj: string): Promise<import("playwright-core").Page>;
export declare function isSessionValid(cnpj: string): Promise<boolean>;
export type SessaoEstado = "ok" | "expired" | "waf";
/** Distingue sessão válida de expirada e de bloqueio WAF/captcha (que exige ação humana). */
export declare function checkSessao(cnpj: string): Promise<SessaoEstado>;
export declare function isWafBody(t: string): boolean;
export declare function ensureSession(cnpj: string): Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map