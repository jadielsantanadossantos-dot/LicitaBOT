import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { config } from "./config";

let connection: IORedis | null = null;
let available = false;
let lastTry = 0;
let connecting: Promise<IORedis | null> | null = null;

async function getConnection(): Promise<IORedis | null> {
  const url = config.redisUrl || process.env.REDIS_URL || "";
  if(!url){
    if(Date.now() - lastTry > 30000){ console.log("[queue] REDIS_URL vazio — fallback memória (LanceQueue 10×CNPJ)"); lastTry = Date.now(); }
    return null;
  }
  if(available && connection && connection.status === "ready") return connection;
  if(connecting) return connecting;
  if(available && connection) return connection;
  if(Date.now() - lastTry < 10000 && !available && connection == null) return null;
  lastTry = Date.now();
  connecting = (async()=>{
    try{
      const c = new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: true, connectTimeout: 2000, lazyConnect: true, retryStrategy: (t)=> Math.min(t*200, 3000) });
      c.on("error", (e)=> console.log("[queue] redis error", e.message.slice(0,120)));
      c.on("close", ()=> { available = false; });
      c.on("ready", ()=> { available = true; console.log("[queue] Redis pronto", url.replace(/:[^@]+@/,"://***@")); });
      await c.connect();
      await c.ping();
      connection = c; available = true;
      console.log("[queue] Redis conectado", url.replace(/:[^@]+@/,"://***@"));
      return c;
    }catch(e:any){
      console.log("[queue] Redis indisponível — fallback memória", e.message.slice(0,120));
      available = false;
      return null;
    } finally { connecting = null; }
  })();
  return connecting;
}
setInterval(()=>{ if(!available) getConnection().catch(()=>{}); }, 30000);

type LancePayload = { licitacaoId: string; cnpj: string; loteId: string; sessItemId: string; valor: number; disputaId: string };

const queues = new Map<string, Queue<LancePayload>>();
const workers = new Map<string, Worker<LancePayload>>();
let fallback: import("@licitabot/engine").LanceQueue | null = null;
async function getFallback(){
  if(fallback) return fallback;
  const { LanceQueue } = await import("@licitabot/engine");
  fallback = new LanceQueue(10, 10);
  return fallback;
}

export async function isRedisAvailable(): Promise<boolean>{ await getConnection(); return available; }

function queueName(cnpj: string){ return `lances:${cnpj}`; }

export async function enqueueLance(payload: LancePayload){
  const conn = await getConnection();
  if(conn){
    const name = queueName(payload.cnpj);
    let q = queues.get(name);
    if(!q) {
      q = new Queue<LancePayload>(name, { connection: conn });
      queues.set(name, q);
      const w = new Worker<LancePayload>(name, async (job)=>{
        const { enviarLance } = await import("./live");
        const { TelegramService } = await import("./modules/telegram");
        const r = await enviarLance(job.data.licitacaoId, job.data.cnpj, job.data.sessItemId, job.data.valor);
        console.log(`[bull] ${job.data.disputaId} ${job.data.loteId} alvo valor=${job.data.valor} ok=${r.ok}`);
        
        if (r.ok) {
          await TelegramService.sendInfo(`Lance Enviado`, `CNPJ: ${job.data.cnpj}\nItem: ${job.data.loteId}\nValor: <b>R$ ${job.data.valor.toFixed(2)}</b>`);
        } else {
          await TelegramService.sendAlert(`Falha no Lance`, `CNPJ: ${job.data.cnpj}\nItem: ${job.data.loteId}\nErro: ${r.mensagem}`);
        }

        if(!r.ok && /429|rate/i.test(r.mensagem)) throw new Error("429 "+r.mensagem);
        return r;
      }, { connection: conn, concurrency: 10, limiter: { max: 10, duration: 1000 } });
      w.on("failed", (job, err)=> console.log(`[bull] failed ${job?.data.loteId} ${err.message.slice(0,120)}`));
      workers.set(name, w);
    }
    const jobId = `${payload.cnpj}:${payload.loteId}:${payload.valor.toFixed(2)}`;
    const existing = await q.getJob(jobId).catch(()=> null);
    if(existing) return;
    await q.add(payload.loteId, payload, {
      jobId,
      attempts: 3,
      backoff: { type:"exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return;
  }
  const fb = await getFallback();
  fb.enqueue({ loteId: payload.loteId, cnpj: payload.cnpj, valor: payload.valor, run: async ()=>{
    const { enviarLance } = await import("./live");
    const { TelegramService } = await import("./modules/telegram");
    const r = await enviarLance(payload.licitacaoId, payload.cnpj, payload.sessItemId, payload.valor);
    console.log(`[mem] ${payload.disputaId} ${payload.loteId} -> ${payload.valor} ok=${r.ok}`);
    if (r.ok) {
      await TelegramService.sendInfo(`Lance Enviado`, `CNPJ: ${payload.cnpj}\nItem: ${payload.loteId}\nValor: <b>R$ ${payload.valor.toFixed(2)}</b>`).catch(()=>{});
    } else {
      await TelegramService.sendAlert(`Falha no Lance`, `CNPJ: ${payload.cnpj}\nItem: ${payload.loteId}\nErro: ${r.mensagem}`).catch(()=>{});
    }
    if(!r.ok && /429|rate/i.test(r.mensagem)) throw new Error("429");
  }});
}

export async function closeQueues(){
  for(const w of workers.values()) await w.close().catch(()=>{});
  for(const q of queues.values()) await q.close().catch(()=>{});
  if(connection) await connection.quit().catch(()=>{});
}

export async function purgeAllQueues() {
  let removed = 0;
  for (const q of queues.values()) {
    try {
      // Descarta aguardando + atrasados + ativos órfãos; mantém workers vivos
      await q.pause().catch(()=>{});
      await q.drain().catch(()=>{});
      for (const state of ["wait", "delayed", "active", "failed"] as const) {
        try { await q.clean(0, 1000, state as any).catch(()=>{}); } catch {}
      }
      await q.resume().catch(()=>{});
      removed++;
    } catch {}
  }
  try {
    const fb = fallback;
    if (fb) removed += fb.clear();
  } catch {}
  // Engine-runner também checa auto=false antes de enfileirar, então
  // nada novo entra após o panic (store.panic desliga todos os autos)
  return { queues: queues.size, clearedFallback: !!fallback };
}
