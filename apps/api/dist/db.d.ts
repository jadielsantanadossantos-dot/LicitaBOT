import { Pool } from "pg";
export declare const pool: Pool;
export declare function query<T = any>(text: string, params?: any[]): Promise<{
    rows: T[];
    rowCount: number;
}>;
export declare function setupDb(): Promise<void>;
//# sourceMappingURL=db.d.ts.map