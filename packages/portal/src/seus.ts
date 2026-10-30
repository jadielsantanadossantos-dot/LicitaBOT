import { fetchWithJar, getCookiesHeader, isSessionValid, loginWithCredentials } from "./auth";

const BASE_OP = "https://operacao.portaldecompraspublicas.com.br";

export interface ProcessoParticipando {
  id: string;
  numero: string;
  orgao: string;
  objeto: string;
  tipo: string;
  abertura: string;
  dataAberturaISO: string;
  situacao: string;
}

function parseAbertura(s: string): string {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
  if (!m) return new Date().toISOString();
  const [, dd, mm, yyyy, hh, mi] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function decode(buf: ArrayBuffer, ct: string): string {
  const b = buf;
  if (ct.toLowerCase().includes("iso-8859") || ct.toLowerCase().includes("latin")) return new TextDecoder("iso-8859-1").decode(b);
  const utf = new TextDecoder("utf-8").decode(b);
  if (utf.includes("�")) return new TextDecoder("iso-8859-1").decode(b);
  return utf;
}

function cell(tr: string, cls: string): string {
  return tr.match(new RegExp('<td class="' + cls + '"[^>]*>([\\s\\S]*?)</td>', "i"))?.[1] ?? "";
}

function parseRows(html: string): { rows: ProcessoParticipando[]; total: number } {
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const rows: ProcessoParticipando[] = [];
  if (!tbody) return { rows, total: 0 };
  const trs = tbody.split(/<tr[^>]*>/i).slice(1);
  for (const tr of trs) {
    const id = tr.match(/DadosPregao\/\?[^"]*ttCD_CHAVE=(\d+)/i)?.[1] ?? tr.match(/ttCD_CHAVE=(\d+)/)?.[1] ?? "";
    if (!id) continue;
    const c80 = cell(tr, "td80");
    const numero = (c80.match(/title="([^"]+)"/i)?.[1] ?? c80.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).trim();
    const c150 = cell(tr, "td150");
    const orgao = (c150.match(/title="([^"]+)"/i)?.[1] ?? c150.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).trim();
    const c190 = cell(tr, "td190");
    const objeto = (c190.match(/title="([^"]+)"/i)?.[1] ?? c190.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).trim();
    const tipo = (cell(tr, "td40").match(/<a[^>]*>([^<]+)<\/a>/i)?.[1] ?? "").trim();
    const abertura = (cell(tr, "td110").match(/<span>([^<]+)<\/span>/i)?.[1] ?? "").trim();
    const situacao = (tr.match(/<td class="td70 alignCenter"><a href="#" title="([^"]+)"/i)?.[1] ?? "").trim();
    rows.push({ id, numero: numero || id, orgao, objeto: objeto || numero, tipo, abertura, dataAberturaISO: abertura ? parseAbertura(abertura) : new Date().toISOString(), situacao });
  }
  const totalM = html.match(/Total de Registros:\s*<b>([^<]+)<\/b>/i);
  const total = totalM ? parseInt(totalM[1].replace(/\./g, ""), 10) : rows.length;
  return { rows, total };
}

/** Lista "Seus Processos" (/4/SeusPregoes/) — pregões que o CNPJ participa. */
export async function buscarSeusPregoes(
  cnpj: string,
  opts: { situacao?: string; q?: string; maxPaginas?: number } = {}
): Promise<{ data: ProcessoParticipando[]; total: number }> {
  const clean = cnpj.replace(/\D/g, "");
  let ck = await getCookiesHeader(clean);
  let valid = ck ? await isSessionValid(clean) : false;
  if (!valid) {
    const ok = await loginWithCredentials(clean);
    if (!ok) return { data: [], total: 0 };
  }
  const maxPag = Math.max(1, Math.min(opts.maxPaginas ?? 10, 20));
  const all: ProcessoParticipando[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (let p = 1; p <= maxPag; p++) {
    const url = `${BASE_OP}/4/SeusPregoes/?ttPagina=${p}`;
    let html = "";
    try {
      const r = await fetchWithJar(clean, url, { headers: { Accept: "text/html" } });
      if (!r.ok) break;
      html = decode(await r.arrayBuffer(), r.headers.get("content-type") || "");
      if (html.includes("kc-form-login")) break;
    } catch {
      break;
    }
    const { rows, total: t } = parseRows(html);
    total = t || total;
    if (!rows.length) break;
    let added = 0;
    for (const r of rows) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        all.push(r);
        added++;
      }
    }
    if (total && all.length >= total) break;
    if (rows.length < 10) break;
    if (p < maxPag) await new Promise((r) => setTimeout(r, 150));
  }
  let filtered = all;
  if (opts.situacao) {
    const s = opts.situacao.toLowerCase();
    filtered = filtered.filter((x) => x.situacao.toLowerCase() === s);
  }
  if (opts.q) {
    const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const q = norm(opts.q);
    filtered = filtered.filter((x) => norm(x.numero).includes(q) || norm(x.objeto).includes(q) || norm(x.orgao).includes(q) || norm(x.id).includes(q));
  }
  return { data: filtered, total: filtered.length };
}
