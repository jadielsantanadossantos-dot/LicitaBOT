import type { Page } from "playwright";
export type LanceFrame = {
    loteId: string;
    valor: number;
    autor?: string;
    ts?: number;
};
export type ChatMsg = {
    texto: string;
    ts?: number;
};
export declare function attachInterceptors(page: Page, opts?: {
    onLance?: (f: LanceFrame) => void;
    onChat?: (m: ChatMsg) => void;
    onServerTime?: (ts: number) => void;
    log?: (msg: string) => void;
}): void;
export declare function sendLanceViaDOM(page: Page, valor: number): Promise<void>;
export declare function sendLanceViaFetch(page: Page, payload: Record<string, unknown>): Promise<{
    status: number;
    body: string;
}>;
//# sourceMappingURL=intercept.d.ts.map