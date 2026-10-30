"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarPregoesReal = buscarPregoesReal;
const auth_1 = require("./auth");
const BASE_OP = "https://operacao.portaldecompraspublicas.com.br";
function toPortalDate(iso) {
    if (!iso)
        return undefined;
    if (iso.includes("/"))
        return iso;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        const [, yyyy, mm, dd] = m;
        return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return undefined;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm2 = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy2 = d.getFullYear();
    return `${dd}/${mm2}/${yyyy2}`;
}
function parseAberturaToISO(s) {
    const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
    if (!m)
        return new Date().toISOString();
    const [, dd, mm, yyyy, hh, mi] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
function isLoginHtml(t) { return t.includes("kc-form-login") || (t.includes("Entrar em Portal") && t.includes("username")); }
async function buscarPregoesReal(cnpj, f = {}) {
    const ck = await (0, auth_1.getCookiesHeader)(cnpj);
    if (!ck)
        return null;
    if (f.dataDe && f.dataAte && f.dataDe !== f.dataAte) {
        const de = new Date(f.dataDe);
        const ate = new Date(f.dataAte);
        const diff = Math.ceil((ate.getTime() - de.getTime()) / 86400000);
        if (diff >= 0 && diff <= 31) {
            const all = [];
            for (let d = new Date(de); d <= ate; d.setDate(d.getDate() + 1)) {
                const iso = d.toISOString().slice(0, 10);
                const sub = await buscarPregoesReal(cnpj, { ...f, dataAbertura: iso, dataDe: undefined, dataAte: undefined });
                if (sub) {
                    for (const r of sub.data) {
                        if (!all.find((x) => x.id === r.id))
                            all.push(r);
                    }
                }
            }
            return { data: all, total: all.length, htmlLen: all.length ? 10000 : 0 };
        }
    }
    function stripAccents(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    const params = new URLSearchParams();
    if (f.orgao)
        params.set("ttOrgao", stripAccents(f.orgao));
    else if (f.q)
        params.set("ttObjeto", stripAccents(f.q));
    if (f.uf) {
        const mapa = { AC: "100112", AL: "100127", AM: "100113", AP: "100116", BA: "100129", CE: "100123", DF: "100153", ES: "100132", GO: "100152", MA: "100121", MG: "100131", MS: "100150", MT: "100151", PA: "100115", PB: "100125", PE: "100126", PI: "100122", PR: "100141", RJ: "100133", RN: "100124", RO: "100111", RR: "100114", RS: "100143", SC: "100142", SE: "100128", SP: "100135", TO: "100117" };
        const cod = mapa[f.uf.toUpperCase()];
        if (cod)
            params.set("slCD_UF", cod);
    }
    if (f.pagina)
        params.set("ttPagina", String(f.pagina));
    if (f.dataAbertura) {
        const v = toPortalDate(f.dataAbertura);
        if (v)
            params.set("ttAbertura", v);
    }
    else if (f.dataDe && f.dataAte && f.dataDe === f.dataAte) {
        const v = toPortalDate(f.dataDe);
        if (v)
            params.set("ttAbertura", v);
    }
    params.set("btBuscar", "Buscar");
    const url = `${BASE_OP}/4/Pregoes/?${params.toString()}`;
    try {
        const r = await (0, auth_1.fetchWithJar)(cnpj, url, { headers: { Accept: "text/html" } });
        const buf = await r.arrayBuffer();
        const ct = r.headers.get("content-type") || "";
        const cs = ct.match(/charset=([^;]+)/i)?.[1]?.toLowerCase();
        const html = (cs === "iso-8859-1" || cs === "latin1" || ct.includes("iso-8859")) ? new TextDecoder("iso-8859-1").decode(buf) : (r.headers.get("content-type")?.includes("charset=iso") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf).includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf));
        if (isLoginHtml(html))
            return null;
        if (!html.includes("searchTable") && !html.includes("Pregoes"))
            return null;
        const rows = [];
        const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? html;
        const chunks = tbody.split(/<tr[^>]*>/i).slice(1);
        for (const seg of chunks) {
            if (!seg.includes("ttCD_CHAVE"))
                continue;
            const id = seg.match(/ttCD_CHAVE=(\d+)/)?.[1] ?? "";
            if (!id)
                continue;
            const td70 = seg.match(/<td[^>]*class="td70"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
            const numero = (td70.match(/title="([^"]+)"/i)?.[1]?.trim()
                || td70.match(/<span[^>]*>([^<]+)<\/span>/i)?.[1]?.trim()
                || td70.match(/<a[^>]*>([^<]+)<\/a>/i)?.[1]?.trim()
                || td70.match(/<p[^>]*>([^<]+)<\/p>/i)?.[1]?.trim()
                || id).replace(/\s+/g, " ").trim();
            const abertura = seg.match(/<td[^>]*class="td110"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i)?.[1]?.trim() ?? "";
            const situacao = seg.match(/alt="([^"]+)"/i)?.[1]?.trim() ?? "";
            const objeto = seg.match(/id="objetoTexto\d+"[^>]*>([^<]+)</i)?.[1]?.trim() ?? seg.match(/title="([^"]{20,})"[^>]*>Constitui/i)?.[1]?.trim() ?? "";
            const orgao = seg.match(/id="unidadeTexto\d+"[^>]*>([^<]+)</i)?.[1]?.trim() ?? seg.match(/<td[^>]*class="td150"[^>]*>[\s\S]*?title="([^"]+)"/i)?.[1]?.trim() ?? "";
            const dataAberturaISO = abertura ? parseAberturaToISO(abertura) : new Date().toISOString();
            const ufM = seg.match(/\/[A-Z]{2}\b[^<]*,/i)?.[0] ?? seg.match(/\b([A-Z]{2})\s*,\s*CEP/i)?.[1] ?? objeto.match(/munic[íi]pio de [^,]+?\s*[-\/]\s*([A-Z]{2})\b/i)?.[1] ?? orgao.match(/\/([A-Z]{2})\b/)?.[1] ?? "";
            let uf = (ufM || "").toString().replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
            if (!uf || uf.length !== 2)
                uf = f.uf ? f.uf.toUpperCase().slice(0, 2) : "";
            if (id)
                rows.push({ id, numero: numero || id, orgao, objeto: objeto || numero, tipo: "", abertura, dataAberturaISO, situacao, uf });
        }
        let filtered = rows;
        const hasDateFilter = !!(f.dataDe || f.dataAte || f.dataAbertura);
        if (!hasDateFilter) {
            const agora = Date.now();
            filtered = filtered.filter(r => new Date(r.dataAberturaISO).getTime() >= agora);
        }
        const totalM = html.match(/Total de Registros:\s*<b>([^<]+)<\/b>/i);
        const total = totalM ? parseInt(totalM[1].replace(/\./g, "")) : filtered.length;
        return { data: filtered, total, htmlLen: html.length };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=scrape.js.map