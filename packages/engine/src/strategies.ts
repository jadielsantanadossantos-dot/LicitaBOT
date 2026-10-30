import type { ItemConfig, EstadoLote } from "@licitabot/shared";

function clampAlvo(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function aplicarPsicologia(valor: number): number {
  // Variação de -0.03 a -0.01 (sempre para baixo): nunca reduz a cobertura
  // nem viola intervaloMinimo por arredondamento para cima
  const offsets = [-0.03, -0.02, -0.01, 0.00];
  const offset = offsets[Math.floor(Math.random() * offsets.length)];
  return +(valor + offset).toFixed(2);
}

function randEntre(minMs: number, maxMs: number): number {
  // Distribuição triangular (2 dados) — concentra no meio, evita padrão uniforme de bot.
  // Nunca retorna número "redondo": soma 0..900ms de micro-jitter.
  const a = Math.random() * (maxMs - minMs);
  const b = Math.random() * (maxMs - minMs);
  const base = minMs + (a + b) / 2;
  const micro = Math.random() * 900;
  return Math.round(base + micro);
}

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
export function calcularDelayHumano(tempoRestanteMs: number | null, opts?: { emGuerra?: boolean }): number {
  const guerra = opts?.emGuerra ?? false;
  let min: number;
  let max: number;
  if (tempoRestanteMs == null) {
    min = 5000; max = 9000;
  } else if (tempoRestanteMs > 120_000) {
    min = 7000; max = 14000;
  } else if (tempoRestanteMs > 60_000) {
    min = 4500; max = 9000;
  } else if (tempoRestanteMs > 30_000) {
    min = 3500; max = 6500;
  } else if (tempoRestanteMs > 10_000) {
    min = 3200; max = 5000;
  } else {
    min = 3200; max = 3800;
  }
  if (guerra) {
    min = Math.max(3200, Math.round(min * 0.6));
    max = Math.max(min + 600, Math.round(max * 0.6));
  }
  return randEntre(min, max);
}

export function calcularReacaoHumana(tempoRestanteMs: number | null): number {
  if (tempoRestanteMs != null && tempoRestanteMs < 15_000) return randEntre(1200, 2500);
  return randEntre(1500, 3500);
}

// Anti-empate universal (Pregão 508293: GUEDES perdeu 79 itens por R$0,01 / empate).
// Quem está em 2º (ou empatado/perdendo) sempre cobre com folga mínima de 0,02 —
// nunca deixa meuLance == menor. Sem marcação de porte: vale para todas as empresas.
const PASSO_ANTI_EMPATE = 0.02;

function validarFinal(item: ItemConfig, menor: number, final: number): boolean {
  if (!Number.isFinite(final) || final <= 0) return false;
  if (final >= menor) return false;
  if (item.piso != null && final < item.piso) return false;
  if (item.intervaloMinimo && menor - final < item.intervaloMinimo - 1e-9) return false;
  return true;
}

function validarJanelaPosicional(item: ItemConfig, valor: number, menor: number, alvo: number, valores: number[]): boolean {
  if (!Number.isFinite(valor) || valor <= 0) return false;
  if (valores.length < alvo) return false;
  const alvoValor = valores[alvo - 1];
  const superior = valores[alvo - 2];
  if (valor >= alvoValor - 1e-9) return false;
  if (valor <= superior + 1e-9) return false;
  if (valor <= menor + 1e-9) return false;
  if (item.piso != null && valor < item.piso - 1e-9) return false;
  return true;
}

function finalizarComPsicologia(item: ItemConfig, menor: number, candidato: number): number | null {
  if (!validarFinal(item, menor, candidato)) return null;
  const comOffset = aplicarPsicologia(candidato);
  if (validarFinal(item, menor, comOffset)) return comOffset;
  return candidato;
}

function finalizarJanelaComPsicologia(item: ItemConfig, menor: number, alvo: number, valores: number[], candidato: number): number | null {
  if (!validarJanelaPosicional(item, candidato, menor, alvo, valores)) return null;
  const comOffset = aplicarPsicologia(candidato);
  if (validarJanelaPosicional(item, comOffset, menor, alvo, valores)) return comOffset;
  return candidato;
}

export function decidirLance(item: ItemConfig, estado: EstadoLote, nowMs: number): number | null {
  if (estado.ranking) return decidirLancePosicional(item, estado, nowMs);
  if (!item.ativo || estado.fase === "ENCERRADA" || estado.fase === "SUSPENSA") return null;
  
  const menor = estado.menorLance;
  if (menor == null) return null;
  
  const decremento = item.decremento;
  if (!Number.isFinite(decremento) || decremento <= 0) return null;
  let candidato: number;

  // --- MODO SNIPER ---
  // Se faltarem menos de 5 segundos, garante cobertura com passo mínimo anti-empate
  // (0.02) em vez do decremento puro — item 508293 fechava empatado.
  if (estado.tempoRestanteMs !== null && estado.tempoRestanteMs < 5000) {
    const passo = Math.max(decremento, (item as any).intervaloMinimo ?? 0, PASSO_ANTI_EMPATE);
    candidato = +(menor - passo).toFixed(2);
  } else {
    candidato = +(menor - decremento).toFixed(2);
  }

  return finalizarComPsicologia(item, menor, candidato);
}

export function decidirLancePosicional(item: ItemConfig, estado: EstadoLote, _nowMs: number): number | null {
  if (!item.ativo || estado.fase === "ENCERRADA" || estado.fase === "SUSPENSA") return null;
  const menor = estado.menorLance;
  if (menor == null) return null;
  const alvo = clampAlvo((item as any).posicaoAlvo);
  const ranking = estado.ranking;
  const posAtual = ranking?.posicao ?? null;
  const estaVencendo = ranking?.estaVencendo ?? null;
  const posRaw = String(ranking?.posicaoRaw ?? "").toLowerCase();
  const empate = posRaw.includes("empat");
  const autorMelhor = ((ranking as any)?.autorMelhor ?? null) as string | null;
  const meuLance = estado.meuLance ?? null;
  const meuEhMenor = meuLance != null && menor != null && Math.abs(meuLance - menor) < 1e-9;
  const empatadoOuPerdendo = empate || estaVencendo === false || autorMelhor === "concorrente" || (meuLance != null && !meuEhMenor);
  const confirmadoVencendo = !empate && (estaVencendo === true || autorMelhor === "eu" || meuEhMenor);
  if (alvo === 1) {
    if (empatadoOuPerdendo) {
    } else if (confirmadoVencendo) return null;
  } else {
    if (!empate && posAtual != null && posAtual === alvo) return null;
    if (posAtual != null && posAtual < alvo) return null;
  }
  const decremento = item.decremento;
  if (!Number.isFinite(decremento) || decremento <= 0) return null;
  if (alvo === 1) {
    const passo = Math.max(decremento, (item as any).intervaloMinimo ?? 0, PASSO_ANTI_EMPATE);
    const candidato = +(menor - passo).toFixed(2);
    return finalizarComPsicologia(item, menor, candidato);
  }
  const valores = ranking?.valores ?? [];
  if (valores.length < alvo) {
    const passo = Math.max(decremento, (item as any).intervaloMinimo ?? 0, PASSO_ANTI_EMPATE);
    const cand = +(menor - passo).toFixed(2);
    return finalizarComPsicologia(item, menor, cand);
  }
  const alvoValor = valores[alvo - 1];
  const superior = valores[alvo - 2];
  // Janela posicional com folga anti-empate: mirar 0.01 cravado deixava FENIX 5º (=ref).
  let candidato = +(alvoValor - Math.max(0.01, PASSO_ANTI_EMPATE)).toFixed(2);
  if (candidato <= superior + 1e-9) {
    const meio = (superior + alvoValor) / 2;
    candidato = +meio.toFixed(2);
    if (candidato <= superior + 1e-9 || candidato >= alvoValor - 1e-9) return null;
  }
  if (item.piso != null && candidato < item.piso - 1e-9) return null;
  return finalizarJanelaComPsicologia(item, menor, alvo, valores, candidato);
}
