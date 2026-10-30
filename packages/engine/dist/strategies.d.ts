import type { ItemConfig, EstadoLote } from "@licitabot/shared";
/**
 * Delay humanizado do PRÓXIMO lance, seguindo o cronômetro do item (tempoRestanteMs).
 *
 * Lógica:
 * - Item com muito tempo (>2min): humano demora, olha outros itens — 12..28s
 * - Meio do pregão: 5..18s conforme urgência
 * - Reta final (<30s): reage rápido mas ainda respeita os 3s do portal
 * - Sniper (<10s): mínimo possível sem tomar "intervalo entre os lances"
 * - Sem cronômetro (null): fallback 7..15s
 *
 * O chamador (engine-runner) ainda aplica por cima:
 * - 21s mínimos desde o NOSSO último lance (regra "entre seus lances: 20s" do portal),
 *   exceto quando o tempo do item não permite esperar (não perde o item por esperar).
 */
export declare function calcularDelayHumano(tempoRestanteMs: number | null, opts?: {
    emGuerra?: boolean;
}): number;
export declare function calcularReacaoHumana(tempoRestanteMs: number | null): number;
export declare function decidirLance(item: ItemConfig, estado: EstadoLote, nowMs: number): number | null;
export declare function decidirLancePosicional(item: ItemConfig, estado: EstadoLote, _nowMs: number): number | null;
//# sourceMappingURL=strategies.d.ts.map