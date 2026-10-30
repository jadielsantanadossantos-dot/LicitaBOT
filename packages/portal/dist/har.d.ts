import type { Page } from "playwright";
export declare function startTracing(page: Page, path?: string): Promise<() => Promise<void>>;
export declare function dumpHar(page: Page, urlFilter?: string): Promise<() => void>;
//# sourceMappingURL=har.d.ts.map