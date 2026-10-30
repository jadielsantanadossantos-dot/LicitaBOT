export type Job = { loteId: string; cnpj: string; valor: number; run: () => Promise<void> };

export class LanceQueue {
  private running = new Map<string, boolean>();
  private queues = new Map<string, Job[]>();
  private maxConcurrent: number;
  private maxPerCnpj: number;
  constructor(maxConcurrent = 10, maxPerCnpj = 10) {
    this.maxConcurrent = maxConcurrent;
    this.maxPerCnpj = maxPerCnpj;
  }
  private key(j: Job) { return `${j.cnpj}:${j.loteId}`; }
  private dedupeKey(j: Job) { return `${j.cnpj}:${j.loteId}:${j.valor.toFixed(2)}`; }
  private pendingValor = new Set<string>();
  private backoffMs = new Map<string, number>();
  enqueue(job: Job) {
    const k = this.key(job);
    const dk = this.dedupeKey(job);
    if (this.pendingValor.has(dk)) return;
    const q = this.queues.get(k) ?? [];
    if (q.some(x => x.valor.toFixed(2) === job.valor.toFixed(2))) return;
    this.pendingValor.add(dk);
    const wrapped: Job = { ...job, run: async () => { try { await job.run(); } finally { this.pendingValor.delete(dk); } } };
    q.push(wrapped);
    this.queues.set(k, q);
    this.drain(k);
  }
  private cnpjOf(k: string){ return k.split(":")[0]; }
  private canRunFor(k: string): boolean {
    if (this.activeCount() >= this.maxConcurrent) return false;
    const cnpj = this.cnpjOf(k);
    let perCnpj = 0;
    for(const [kk,v] of this.running) if(v && this.cnpjOf(kk)===cnpj) perCnpj++;
    return perCnpj < this.maxPerCnpj;
  }
  private async drain(k: string) {
    if (this.running.get(k)) return;
    const q = this.queues.get(k);
    if (!q?.length) return;
    if (!this.canRunFor(k)) { setTimeout(() => this.drain(k), 200); return; }
    const waitBackoff = this.backoffMs.get(k) ?? 0;
    if (waitBackoff) { await new Promise(r=> setTimeout(r, waitBackoff)); }
    this.running.set(k, true);
    const job = q.shift()!;
    try {
      // Jitter humano antes do envio: digitação + clique (800..2400ms, triangular).
      // Somado ao delay do engine-runner (por tempo do item), o intervalo total
      // entre lances nunca é redondo nem previsível.
      const j1 = Math.random() * 1600;
      const j2 = Math.random() * 1600;
      const jitter = 800 + (j1 + j2) / 2 + Math.random() * 150;
      await new Promise(r => setTimeout(r, jitter));
      await job.run();
      this.backoffMs.set(k, 0);
    } catch (e:any) {
      const msg = String(e?.message ?? e);
      if (/429|rate/i.test(msg)) {
        const cur = this.backoffMs.get(k) ?? 0;
        const next = cur ? Math.min(cur*2, 8000) : 2000;
        this.backoffMs.set(k, next);
      }
      throw e;
    } finally {
      this.running.set(k, false);
      if (q.length) setTimeout(()=> this.drain(k), 50);
    }
  }
  private activeCount() { return [...this.running.values()].filter(Boolean).length; }
  /** Panic: descarta tudo que está aguardando (não interrompe o job já em voo) */
  clear() {
    let removed = 0;
    for (const q of this.queues.values()) removed += q.length;
    this.queues.clear();
    this.pendingValor.clear();
    this.backoffMs.clear();
    return removed;
  }
  pendingCount() {
    let n = 0;
    for (const q of this.queues.values()) n += q.length;
    return n;
  }
}
