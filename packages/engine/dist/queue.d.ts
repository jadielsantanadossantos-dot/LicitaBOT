export type Job = {
    loteId: string;
    cnpj: string;
    valor: number;
    run: () => Promise<void>;
};
export declare class LanceQueue {
    private running;
    private queues;
    private maxConcurrent;
    private maxPerCnpj;
    constructor(maxConcurrent?: number, maxPerCnpj?: number);
    private key;
    private dedupeKey;
    private pendingValor;
    private backoffMs;
    enqueue(job: Job): void;
    private cnpjOf;
    private canRunFor;
    private drain;
    private activeCount;
    /** Panic: descarta tudo que está aguardando (não interrompe o job já em voo) */
    clear(): number;
    pendingCount(): number;
}
//# sourceMappingURL=queue.d.ts.map