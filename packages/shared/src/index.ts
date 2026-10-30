export type CNPJ = string;
export type ModoDisputa = "ABERTO" | "ABERTO_FECHADO" | "FECHADO";
export type Estrategia = "cobrir_minimo" | "agressivo" | "conservador" | "sniper";

export interface ItemConfig {
  id: string;
  loteId: string;
  descricao?: string;
  piso: number | null;
  decremento: number;
  intervaloMinimo?: number;
  estrategia: Estrategia;
  ativo: boolean;
  posicaoAlvo: number;
}

export interface DisputaConfig {
  id: string;
  processoId: string;
  editalId?: string;
  cnpj: CNPJ;
  modo: ModoDisputa;
  dataHora: string;
  status: "rascunho" | "agendada" | "em_andamento" | "encerrada";
  exequibilidade?: number;
  itens: ItemConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface Lance {
  loteId: string;
  valor: number;
  timestampServidor?: number;
  autor?: string;
}

export interface RankingEstado {
  posicao: number | null;
  posicaoRaw: string | null;
  estaVencendo: boolean | null;
  valores: number[];
  qtdLances: number | null;
  autorMelhor?: "eu" | "concorrente" | null;
}

export interface EstadoLote {
  loteId: string;
  menorLance: number | null;
  meuLance: number | null;
  tempoRestanteMs: number | null;
  fase: "ABERTA" | "RAND" | "FECHADA" | "ENCERRADA" | "SUSPENSA";
  modo: ModoDisputa;
  ranking: RankingEstado | null;
}

export interface EditalResumo {
  id: string;
  numero: string;
  objeto: string;
  orgao: string;
  uf: string;
  municipio?: string;
  dataAbertura: string;
  modo: ModoDisputa;
  valorEstimado?: number;
  url?: string;
}

export interface LoteResumo {
  id: string;
  editalId: string;
  numero: number;
  descricao: string;
  quantidade?: number;
  unidade?: string;
  valorReferencia?: number;
  intervaloMinimo?: number;
}

export interface FiltroEditais {
  q?: string;
  numero?: string;
  cidade?: string;
  objeto?: string;
  uf?: string;
  modo?: ModoDisputa;
  page?: number;
  pageSize?: number;
  dataDe?: string;
  dataAte?: string;
  dataAbertura?: string;
}

export function validarDisputa(d: Partial<DisputaConfig>): string[] {
  const e: string[] = [];
  if (!d.cnpj) e.push("cnpj obrigatório");
  if (!d.processoId) e.push("processoId obrigatório");
  if (!d.modo) e.push("modo obrigatório");
  if (!d.dataHora) e.push("dataHora obrigatória");
  if (!d.itens?.length) e.push("ao menos 1 item");
  if (d.exequibilidade != null && (!Number.isFinite(d.exequibilidade) || d.exequibilidade < 10 || d.exequibilidade > 100)) e.push("exequibilidade deve ser 10..100 (%)");
  d.itens?.forEach((it, i) => {
    if (it.piso != null && it.piso < 0) e.push(`itens[${i}].piso inválido`);
    if (it.decremento == null || it.decremento <= 0) e.push(`itens[${i}].decremento deve ser >0`);
    if (it.intervaloMinimo != null && it.intervaloMinimo < 0) e.push(`itens[${i}].intervaloMinimo inválido`);
    if (it.piso != null && it.decremento != null && it.decremento > it.piso) e.push(`itens[${i}].decremento não pode exceder piso`);
    const pa = (it as any).posicaoAlvo;
    if (pa == null || !Number.isInteger(pa) || pa < 1 || pa > 10) e.push(`itens[${i}].posicaoAlvo deve ser 1..10`);
  });
  const cnpjs = new Set(d.itens?.map((x) => x.loteId));
  if (cnpjs.size !== d.itens?.length) e.push("loteId duplicado entre itens");
  return e;
}

export function validarCNPJ(cnpj: string): boolean {
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
  const calc = (base: string, pesos: number[]) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += parseInt(base[i], 10) * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const b12 = n.slice(0, 12);
  const d13 = calc(b12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d14 = calc(b12 + String(d13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return n === b12 + String(d13) + String(d14);
}
