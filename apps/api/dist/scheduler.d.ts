export declare function startScheduler(): void;
export declare function agendaSnapshot(): Promise<{
    id: string;
    processoId: string;
    cnpj: string;
    dataHora: string;
    status: "rascunho" | "agendada" | "em_andamento" | "encerrada";
    msAte: number;
    itens: number;
    exequibilidade: any;
}[]>;
//# sourceMappingURL=scheduler.d.ts.map