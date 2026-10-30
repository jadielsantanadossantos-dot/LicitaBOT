type LancePayload = {
    licitacaoId: string;
    cnpj: string;
    loteId: string;
    sessItemId: string;
    valor: number;
    disputaId: string;
};
export declare function isRedisAvailable(): Promise<boolean>;
export declare function enqueueLance(payload: LancePayload): Promise<void>;
export declare function closeQueues(): Promise<void>;
export declare function purgeAllQueues(): Promise<{
    queues: number;
    clearedFallback: boolean;
}>;
export {};
//# sourceMappingURL=queue-bull.d.ts.map