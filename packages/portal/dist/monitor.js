"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarEditais = buscarEditais;
exports.obterEdital = obterEdital;
exports.obterLotes = obterLotes;
exports.buscarEditaisViaPlaywright = buscarEditaisViaPlaywright;
const auth_1 = require("./auth");
const scrape_1 = require("./scrape");
const BASE_PUBLIC = "https://portaldecompraspublicas.com.br";
const BASE_OP = "https://operacao.portaldecompraspublicas.com.br";
async function tentarPortalAutenticado(f, cnpj) {
    const targetCnpj = cnpj ?? process.env.PORTAL_CNPJ ?? "32977510000100";
    let ck = await (0, auth_1.getCookiesHeader)(targetCnpj);
    let valid = ck ? await (0, auth_1.isSessionValid)(targetCnpj) : false;
    if (!valid) {
        const ok = await (0, auth_1.loginWithCredentials)(targetCnpj);
        if (!ok)
            return null;
        valid = await (0, auth_1.isSessionValid)(targetCnpj);
        if (!valid)
            return null;
    }
    const serverQ = f.objeto || f.q || undefined;
    async function fetchOne(qOverride, pageOverride, orgaoOverride) {
        const q = qOverride !== undefined ? qOverride : serverQ;
        const p = pageOverride ?? f.page ?? 1;
        const orgao = orgaoOverride !== undefined ? orgaoOverride : undefined;
        const chunk = await (0, scrape_1.buscarPregoesReal)(targetCnpj, { q, orgao, uf: f.uf, pagina: p, pageSize: f.pageSize, dataDe: f.dataDe, dataAte: f.dataAte, dataAbertura: f.dataAbertura });
        if (!chunk || !chunk.data.length)
            return null;
        return { data: chunk.data, total: chunk.total };
    }
    let real = await fetchOne();
    if (!real) {
        const ok2 = await (0, auth_1.loginWithCredentials)(targetCnpj);
        if (ok2)
            real = await fetchOne();
    }
    if (f.numero) {
        const normNeed = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split("/").map(x => x.replace(/^0+/, "") || "0").join("/");
        const need = normNeed(f.numero);
        const hasMatch = (real?.data ?? []).some((e) => normNeed(String(e.numero)).includes(need));
        if (!hasMatch) {
            const all = [];
            const seen = new Set();
            const existing = real?.data ?? [];
            for (const r of existing) {
                if (!seen.has(r.id)) {
                    seen.add(r.id);
                    all.push(r);
                }
            }
            for (let p = 1; p <= 10; p++) {
                if (p === 1 && existing.length)
                    continue;
                const ch = await fetchOne("", p);
                if (!ch)
                    break;
                let ad = 0;
                for (const r of ch.data) {
                    if (!seen.has(r.id)) {
                        seen.add(r.id);
                        all.push(r);
                        ad++;
                    }
                }
                if (!ad && p > 1)
                    break;
                if (all.some((e) => normNeed(String(e.numero)).includes(need)))
                    break;
                if (ch.data.length < 10)
                    break;
            }
            if (all.length) {
                const matched = all.filter((e) => normNeed(String(e.numero)).includes(need));
                if (matched.length)
                    real = { data: all, total: all.length };
                else if (!real || !real.data.length)
                    real = { data: all, total: all.length };
            }
        }
    }
    if (f.cidade) {
        const normCity = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const needC = normCity(f.cidade);
        const hasCity = (real?.data ?? []).some((e) => normCity(String(e.orgao)).includes(needC) || normCity(String(e.municipio || "")).includes(needC) || normCity(String(e.objeto)).includes(needC));
        if (!hasCity) {
            const allCity = [];
            const seenC = new Set();
            for (let p = 1; p <= 8; p++) {
                const ch = await (0, scrape_1.buscarPregoesReal)(targetCnpj, { orgao: f.cidade, uf: f.uf, pagina: p, pageSize: f.pageSize, dataDe: f.dataDe, dataAte: f.dataAte, dataAbertura: f.dataAbertura });
                if (!ch || !ch.data.length) {
                    if (p === 1)
                        continue;
                    break;
                }
                for (const r of ch.data) {
                    if (!seenC.has(r.id)) {
                        seenC.add(r.id);
                        allCity.push(r);
                    }
                }
                const hit = allCity.some((r) => normCity(String(r.orgao)).includes(needC) || normCity(String(r.objeto)).includes(needC));
                if (hit)
                    break;
                if (ch.data.length < 10)
                    break;
            }
            if (allCity.length) {
                const hit = allCity.some((r) => normCity(String(r.orgao)).includes(needC) || normCity(String(r.objeto)).includes(needC));
                if (hit) {
                    if (real?.data?.length) {
                        const merged = [];
                        const seenM = new Set();
                        for (const r of [...real.data, ...allCity])
                            if (!seenM.has(r.id)) {
                                seenM.add(r.id);
                                merged.push(r);
                            }
                        real = { data: merged, total: merged.length };
                    }
                    else {
                        real = { data: allCity, total: allCity.length };
                    }
                }
                else if (!real?.data?.length) {
                    const all = [];
                    const seen = new Set();
                    for (let p = 1; p <= 10; p++) {
                        const ch = await fetchOne("", p);
                        if (!ch)
                            break;
                        for (const r of ch.data) {
                            if (!seen.has(r.id)) {
                                seen.add(r.id);
                                all.push(r);
                            }
                        }
                        if (all.some((e) => normCity(String(e.orgao)).includes(needC) || normCity(String(e.objeto)).includes(needC)))
                            break;
                        if (ch.data.length < 10)
                            break;
                    }
                    if (all.length)
                        real = { data: all, total: all.length };
                }
            }
        }
    }
    if (real && real.total > real.data.length && !f.numero) {
        const all = [...real.data];
        const seen = new Set(all.map((x) => x.id));
        const totalPages = Math.ceil(real.total / 10);
        for (let p = 2; p <= Math.min(totalPages, 20); p++) {
            const ch = await (0, scrape_1.buscarPregoesReal)(targetCnpj, { q: serverQ ?? undefined, orgao: undefined, uf: f.uf, pagina: p, pageSize: f.pageSize, dataDe: f.dataDe, dataAte: f.dataAte, dataAbertura: f.dataAbertura });
            if (!ch || !ch.data.length)
                break;
            let added = 0;
            for (const r of ch.data)
                if (!seen.has(r.id)) {
                    seen.add(r.id);
                    all.push(r);
                    added++;
                }
            if (!added)
                break;
            if (all.length >= real.total)
                break;
            if (ch.data.length < 10)
                break;
        }
        real = { data: all, total: real.total };
    }
    if (!real || !real.data.length)
        return { data: [], total: 0 };
    const municipioParaUf = { "patis": "MG", "triunfo": "PB", "massaranduba": "PB", "cruzeta": "RN", "mogeiro": "PB", "santa rosa": "RS", "boa vista do cadeado": "RS", "sinop": "MT", "serra caiada": "RN", "sape": "PB", "cabedelo": "PB", "joao pessoa": "PB", "sao jose": "SC", "guarabira": "PB", "aruja": "SP", "barao de cotegipe": "RS", "natal": "RN", "santo antonio dapatrulha": "RS", "santo antonio da patrulha": "RS", "coite do noia": "AL", "porto grande": "AP" };
    const data = real.data.map((r) => {
        const rawUf = String(r.uf || "").trim().toUpperCase();
        const fallbackUf = rawUf && rawUf !== "--" ? rawUf : String(f.uf || "").trim().toUpperCase();
        const fromOrgao = String(r.orgao || "").match(/\/\s*([A-Z]{2})\b/)?.[1] ?? String(r.orgao || "").match(/\b([A-Z]{2})\s*,\s*CEP/i)?.[1] ?? "";
        let ufFinal = (fallbackUf || fromOrgao || "").slice(0, 2).toUpperCase();
        if (!ufFinal) {
            const mun = String(r.orgao.match(/Prefeitura Municipal de ([^-—\/\n]+)/i)?.[1] || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            ufFinal = municipioParaUf[mun] || "";
            if (!ufFinal) {
                for (const [k, v] of Object.entries(municipioParaUf))
                    if (mun.includes(k)) {
                        ufFinal = v;
                        break;
                    }
            }
        }
        ufFinal = ufFinal || "--";
        return {
            id: String(r.id),
            numero: String(r.numero),
            objeto: String(r.objeto || r.numero),
            orgao: String(r.orgao),
            uf: ufFinal,
            municipio: String(r.orgao.match(/Prefeitura Municipal de ([^-—]+)/i)?.[1] || "").trim() || undefined,
            dataAbertura: r.dataAberturaISO,
            modo: "ABERTO",
            valorEstimado: undefined,
            url: `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${r.id}`,
        };
    });
    let filtered = data;
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normNum = (s) => norm(s).split("/").map(p => p.replace(/^0+/, "") || "0").join("/");
    if (f.numero) {
        const n = normNum(f.numero);
        filtered = filtered.filter(e => normNum(e.numero).includes(n) || norm(e.id).includes(n));
    }
    if (f.cidade) {
        const c = norm(f.cidade);
        filtered = filtered.filter(e => norm(e.orgao).includes(c) || norm(e.municipio || "").includes(c) || norm(e.objeto).includes(c));
    }
    if (f.objeto) {
        const o = norm(f.objeto);
        filtered = filtered.filter(e => norm(e.objeto).includes(o));
    }
    else if (f.q) {
        const q = norm(f.q);
        filtered = filtered.filter(e => norm(e.objeto).includes(q) || norm(e.numero).includes(q) || norm(e.orgao).includes(q));
    }
    return { data: filtered, total: filtered.length === data.length ? real.total : filtered.length };
}
async function buscarEditais(filtro = {}, cnpj) {
    const portal = await tentarPortalAutenticado(filtro, cnpj);
    if (portal)
        return { ...portal, source: "portal" };
    return { data: [], total: 0, source: "portal" };
}
async function obterEdital(id) {
    const { data } = await buscarEditais({ pageSize: 100 });
    return data.find((e) => e.id === id) ?? null;
}
async function obterLotes(editalId, cnpjOverride) {
    const cnpj = (cnpjOverride?.replace(/\D/g, "") || process.env.PORTAL_CNPJ || "32977510000100").replace(/\D/g, "");
    try {
        const ok = await Promise.race([(0, auth_1.isSessionValid)(cnpj), new Promise((_, rej) => setTimeout(() => rej(new Error("sessao tmt")), 4000))]).catch(() => false);
        if (!ok)
            await Promise.race([(0, auth_1.loginWithCredentials)(cnpj).catch(() => false), new Promise(r => setTimeout(r, 5000))]);
    }
    catch { }
    function parseDescricaoLote(tr, numero) {
        const title = tr.match(/href="#produtoTexto\d+"[^>]*title="([^"]+)"/i)?.[1] ?? tr.match(/title="([^"]{20,})"/i)?.[1] ?? "";
        if (title.trim())
            return title.trim().slice(0, 600);
        const descrFallback = tr.match(/<p id="produtoTexto\d+"[^>]*>([^<]+)</i)?.[1] ?? "";
        if (descrFallback.trim())
            return descrFallback.trim().slice(0, 600);
        // Descrições curtas vêm como <span> puro (sem link produtoTexto) — era o filtro que descartava itens
        const td250 = tr.match(/<td class="td250">([\s\S]*?)<\/td>/i)?.[1] ?? "";
        const texto = td250.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (texto)
            return texto.slice(0, 600);
        return `Item ${numero}`;
    }
    try {
        const { fetchWithJar } = await Promise.resolve().then(() => __importStar(require("./auth")));
        const seen = new Map();
        let totalEsperado = 0;
        for (let p = 1; p <= 20; p++) {
            const url = `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${editalId}&ttPagina=${p}`;
            let html = "";
            try {
                const r = await Promise.race([fetchWithJar(cnpj, url, { headers: { Accept: "text/html" } }), new Promise((_, rej) => setTimeout(() => rej(new Error("tmt2")), 6000))]);
                const buf = await r.arrayBuffer();
                const ct = r.headers.get("content-type") || "";
                const cs = (ct.match(/charset=([^;]+)/i)?.[1] ?? "").toLowerCase();
                if (cs === "iso-8859-1" || cs === "latin1" || (ct || "").toLowerCase().includes("iso-8859"))
                    html = new TextDecoder("iso-8859-1").decode(buf);
                else {
                    const t = new TextDecoder("utf-8").decode(buf);
                    html = t.includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : t;
                }
                if (!html || html.includes("kc-form-login") || (html.includes("Entrar em Portal") && html.includes("username")))
                    break;
            }
            catch {
                break;
            }
            if (!html || !html.includes("searchTable"))
                break;
            const tbody = html.match(/<table[^>]*id="searchTableSorter"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? html.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
            if (!tbody)
                break;
            let added = 0;
            const reTr = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let m;
            while ((m = reTr.exec(tbody))) {
                const tr = m[1];
                const numStr = tr.match(/<td class="td50"><span>\s*0*(\d+)\s*<\/span>/i)?.[1] ?? tr.match(/<td class="td50">\s*0*(\d+)/i)?.[1] ?? "";
                if (!numStr)
                    continue; // linha sem número de item (cabeçalho/agrupador)
                const numero = parseInt(numStr, 10);
                const descricao = parseDescricaoLote(tr, numero);
                const qtdRaw = tr.match(/<td class="td150"><span>([^<]+)<\/span>/i)?.[1]?.trim() ?? "";
                let quantidade;
                let unidade;
                if (qtdRaw && qtdRaw !== "--") {
                    const qm = qtdRaw.match(/([\d\.,]+)\s*(\S+)?/);
                    if (qm) {
                        quantidade = parseFloat(qm[1].replace(/\./g, "").replace(",", "."));
                        unidade = qm[2];
                    }
                }
                const id = `${editalId}-${String(numero).padStart(4, "0")}`;
                if (seen.has(id))
                    continue;
                seen.set(id, { id, editalId, numero, descricao, quantidade, unidade, valorReferencia: undefined, intervaloMinimo: undefined });
                added++;
            }
            if (!added)
                break;
            const totM = html.match(/Total de Registros:\s*<b>(\d+)<\/b>/i) ?? html.match(/Total de Registros:\s*(\d+)/i);
            if (totM) {
                totalEsperado = parseInt(totM[1].replace(/\./g, ""), 10);
                if (seen.size >= totalEsperado)
                    break;
            }
            // Não parar em página parcial: só termina no total ou em página vazia
        }
        if (seen.size)
            return [...seen.values()].sort((a, b) => a.numero - b.numero);
    }
    catch { }
    try {
        const { obterHtmlAba, parseItens } = await Promise.resolve().then(() => __importStar(require("./sessao")));
        const seen = new Map();
        for (let p = 1; p <= 3; p++) {
            let html = "";
            try {
                html = await Promise.race([obterHtmlAba(cnpj, editalId, 0, p, 1), new Promise((_, rej) => setTimeout(() => rej(new Error("tmt")), 5000))]);
            }
            catch {
                break;
            }
            if (!html || html.includes("kc-form-login"))
                break;
            const itens = parseItens(html);
            if (!itens.length)
                break;
            let added = 0;
            for (const it of itens) {
                if (seen.has(it.id))
                    continue;
                seen.set(it.id, { id: it.id, editalId, numero: Number(it.numero) || seen.size + 1, descricao: it.descricao || `Item ${it.id}`, valorReferencia: it.referencia ?? undefined, intervaloMinimo: undefined });
                added++;
            }
            if (!added)
                break;
            if (itens.length < 10)
                break;
        }
        if (seen.size)
            return [...seen.values()].sort((a, b) => a.numero - b.numero);
    }
    catch { }
    try {
        const { fetchWithJar } = await Promise.resolve().then(() => __importStar(require("./auth")));
        const seen2 = new Map();
        for (let p = 1; p <= 20; p++) {
            const url = `${BASE_OP}/4/Pregoes/DadosPregao/?ttCD_CHAVE=${editalId}&ttPagina=${p}`;
            let html = "";
            try {
                const r = await Promise.race([fetchWithJar(cnpj, url, { headers: { Accept: "text/html" } }), new Promise((_, rej) => setTimeout(() => rej(new Error("tmt2")), 8000))]);
                const buf = await r.arrayBuffer();
                const ct = r.headers.get("content-type") || "";
                const cs = ct.match(/charset=([^;]+)/i)?.[1]?.toLowerCase();
                if (cs === "iso-8859-1" || ct.includes("iso-8859"))
                    html = new TextDecoder("iso-8859-1").decode(buf);
                else {
                    const t = new TextDecoder("utf-8").decode(buf);
                    html = t.includes("�") ? new TextDecoder("iso-8859-1").decode(buf) : t;
                }
                if (html.includes("kc-form-login") || (html.includes("Entrar em Portal") && html.includes("username")))
                    break;
            }
            catch {
                break;
            }
            if (!html || !html.includes("searchTable"))
                break;
            const tbody = html.match(/<table[^>]*id="searchTableSorter"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
            if (!tbody)
                break;
            let added = 0;
            const reTr = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let m;
            while ((m = reTr.exec(tbody))) {
                const tr = m[1];
                const numStr = tr.match(/<td class="td50"><span>0*(\d+)<\/span>/i)?.[1] ?? tr.match(/<td class="td50">\s*0*(\d+)/i)?.[1] ?? "";
                if (!numStr)
                    continue;
                const numero = parseInt(numStr, 10);
                const descricao = parseDescricaoLote(tr, numero);
                const qtdRaw = tr.match(/<td class="td150"><span>([^<]+)<\/span>/i)?.[1]?.trim() ?? "";
                let quantidade;
                let unidade;
                if (qtdRaw) {
                    const qm = qtdRaw.match(/([\d\.,]+)\s*(\S+)?/);
                    if (qm) {
                        quantidade = parseFloat(qm[1].replace(/\./g, "").replace(",", "."));
                        unidade = qm[2];
                    }
                }
                const id = `${editalId}-${String(numero).padStart(4, "0")}`;
                if (seen2.has(id))
                    continue;
                seen2.set(id, { id, editalId, numero, descricao, quantidade, unidade, valorReferencia: undefined, intervaloMinimo: undefined });
                added++;
            }
            if (!added)
                break;
            const totM = html.match(/Total de Registros:\s*<b>(\d+)<\/b>/i);
            if (totM && seen2.size >= parseInt(totM[1].replace(/\./g, ""), 10))
                break;
            // Não parar em página parcial: só termina no total ou em página vazia
        }
        if (seen2.size)
            return [...seen2.values()].sort((a, b) => a.numero - b.numero);
    }
    catch { }
    const candidatos = [
        `${BASE_OP}/api/public/processos/${editalId}/lotes`,
        `${BASE_OP}/api/public/processos/${editalId}/itens`,
        `${BASE_PUBLIC}/api/processos/${editalId}/lotes`,
    ];
    for (const url of candidatos) {
        try {
            const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
            if (!res.ok)
                continue;
            const json = await res.json();
            const arr = Array.isArray(json) ? json : json.data ?? json.content ?? json.lotes ?? json.itens ?? [];
            if (!arr.length)
                continue;
            return arr.map((x, i) => ({
                id: String(x.id ?? x.loteId ?? `${editalId}-l${i}`),
                editalId,
                numero: Number(x.numero ?? x.lote ?? i + 1),
                descricao: String(x.descricao ?? x.objeto ?? ""),
                quantidade: x.quantidade,
                unidade: x.unidade,
                valorReferencia: x.valorReferencia ?? x.valorEstimado ?? x.valor,
                intervaloMinimo: x.intervaloMinimo ?? x.decrementoMinimo,
            }));
        }
        catch { }
    }
    return [];
}
async function buscarEditaisViaPlaywright(page, filtro = {}) {
    await page.goto(`${BASE_PUBLIC}/processos`, { waitUntil: "domcontentloaded" });
    const captured = [];
    page.on("response", async (r) => {
        if (r.url().includes("/api/") && r.url().includes("processo")) {
            try {
                captured.push(await r.json());
            }
            catch { }
        }
    });
    await page.waitForTimeout(3000);
    if (captured.length) {
        const flat = captured.flatMap((c) => (Array.isArray(c) ? c : c.data ?? c.content ?? []));
        if (flat.length)
            return { data: flat, total: flat.length };
    }
    return buscarEditais(filtro);
}
//# sourceMappingURL=monitor.js.map