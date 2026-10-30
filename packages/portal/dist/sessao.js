"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePosicaoNumero = parsePosicaoNumero;
exports.obterHoraServidor = obterHoraServidor;
exports.obterChat = obterChat;
exports.obterStatus = obterStatus;
exports.obterHtmlAba = obterHtmlAba;
exports.parseItens = parseItens;
exports.fetchRanking = fetchRanking;
exports.fetchHistorico = fetchHistorico;
exports.isLanceRejeitado = isLanceRejeitado;
exports.enviarLanceViaFetch = enviarLanceViaFetch;
exports.enviarLanceViaDOM = enviarLanceViaDOM;
exports.attachSessaoPolling = attachSessaoPolling;
const auth_1 = require("./auth");
const BASE_OP = "https://operacao.portaldecompraspublicas.com.br";
const BASE_API = "https://apipcp.portaldecompraspublicas.com.br";
function parseHoraSegs(s) {
    if (!s)
        return null;
    const m = String(s).trim().match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
    if (!m)
        return null;
    if (m[3] !== undefined)
        return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    return Number(m[1]) * 3600 + Number(m[2]) * 60;
}
function fmtRegressiva(totalSeg) {
    const mm = Math.floor(totalSeg / 60);
    const ss = totalSeg - mm * 60;
    return `${mm < 10 ? "0" : ""}${mm}:${ss < 10 ? "0" : ""}${ss}`;
}
function parsePosicaoNumero(raw) {
    if (!raw)
        return null;
    if (/desclassificado/i.test(raw))
        return 99;
    const m = raw.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
}
function isExpiredBody(t) { return t.includes('"urlRedir"') && t.includes("Logout") || (t.includes("Entrar em Portal") && t.includes("kc-form-login")); }
async function obterHoraServidor(cnpj) {
    try {
        const r = cnpj ? await (0, auth_1.fetchWithJar)(cnpj, `${BASE_API}/hora?_=${Date.now()}`) : await fetch(`${BASE_API}/hora?_=${Date.now()}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        const t = await r.text();
        const d = new Date(t);
        return isNaN(d.getTime()) ? null : d;
    }
    catch {
        return null;
    }
}
async function obterChat(cnpj, licitacaoId, ultimoId = 0) {
    const url = `${BASE_API}/fornecedor/processo/${licitacaoId}/chat?ttCD_LICITACAO=${licitacaoId}&ttUltimoId=${ultimoId}&_=${Date.now()}`;
    try {
        const r = await (0, auth_1.fetchWithJar)(cnpj, url, { headers: { Accept: "application/json" } });
        if (!r.ok)
            return { mensagens: [] };
        const j = await r.json().catch(() => null);
        if (!j)
            return { mensagens: [] };
        if (j.urlRedir)
            return { mensagens: [] };
        return { mensagens: (j.mensagens ?? []), permissaoMensagem: j.permissaoMensagem };
    }
    catch {
        return { mensagens: [] };
    }
}
async function obterStatus(cnpj, licitacaoId) {
    const url = `${BASE_API}/fornecedor/processo/${licitacaoId}/operacao?ttCD_LICITACAO=${licitacaoId}&_=${Date.now()}`;
    try {
        const r = await (0, auth_1.fetchWithJar)(cnpj, url);
        if (!r.ok)
            return "";
        const t = await decodeHtml(r);
        if (isExpiredBody(t))
            return "";
        return t.trim();
    }
    catch {
        return "";
    }
}
async function decodeHtml(r) {
    const ct = r.headers.get("content-type") || "";
    const buf = await r.arrayBuffer();
    const needsLatin = ct.toLowerCase().includes("iso-8859") || ct.toLowerCase().includes("latin");
    if (needsLatin)
        return new TextDecoder("iso-8859-1").decode(buf);
    const utf = new TextDecoder("utf-8").decode(buf);
    if (utf.includes("�"))
        return new TextDecoder("iso-8859-1").decode(buf);
    return utf;
}
async function obterHtmlAba(cnpj, licitacaoId, param = 0, pagina = 1, paginaItemLote = 1) {
    const candidates = [
        `${BASE_OP}/4/SessaoPublica/lances/htmlAba.asp`,
        `${BASE_OP}/4/SessaoPublica/lances/htmlLance.asp`,
    ];
    for (const url of candidates) {
        const body = `param=${param}&ttCD_LICITACAO=${licitacaoId}&ttPagina=${pagina}&ttPaginaItemLote=${paginaItemLote}`;
        try {
            const r = await (0, auth_1.fetchWithJar)(cnpj, url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, redirect: "follow" });
            const t = await decodeHtml(r);
            if (isExpiredBody(t))
                return "";
            if (t && t.length > 500 && !t.includes("Sessão expirada"))
                return t;
            if (t && t.length > 200 && t.includes('id="item'))
                return t;
        }
        catch { }
    }
    return "";
}
function parseItens(html) {
    if (!html || isExpiredBody(html))
        return [];
    const itens = [];
    // Hora do servidor vinda da própria página (mesma base do JS do portal: processarTimer usa horaAtual)
    const horaAtualRaw = html.match(/<input[^>]*name="horaAtual"[^>]*value="([^"]+)"/i)?.[1] ?? null;
    const horaAtualSegs = parseHoraSegs(horaAtualRaw);
    const reTr = /<tr\s+id="item(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let m;
    while ((m = reTr.exec(html))) {
        const id = m[1];
        const tr = m[2];
        const numero = (tr.match(/<td class="td70"><span>([^<]+)<\/span>/i)?.[1] ?? "").trim();
        let descricao = "";
        const titleM = tr.match(/<a[^>]*href="#produtoTexto\d+"[^>]*title="([^"]+)"/i);
        if (titleM?.[1]?.trim())
            descricao = titleM[1].trim();
        else {
            const pM = tr.match(/<p[^>]*id="produtoTexto\d+"[^>]*>([^<]+)</i);
            if (pM?.[1]?.trim())
                descricao = pM[1].trim();
            else {
                const aM = tr.match(/<a[^>]*href="#produtoTexto\d+"[^>]*>([^<]+)<\/a>/i);
                if (aM?.[1]?.trim())
                    descricao = aM[1].trim().replace(/\.\.\.$/, "");
                else {
                    const td200 = tr.match(/<td class="td200">([\s\S]*?)<\/td>/i)?.[1] ?? tr.match(/<td class="td250">([\s\S]*?)<\/td>/i)?.[1] ?? "";
                    if (td200)
                        descricao = td200.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
                }
            }
        }
        const refRaw = tr.match(/<td class="td140"><span>R\$\s*([^<]+)<\/span>/i)?.[1];
        const referencia = refRaw ? parseFloat(refRaw.replace(/\./g, "").replace(",", ".")) : null;
        const melhorRaw = tr.match(/<input name="precoItem"[^>]*value="([^"]+)"/i)?.[1] ?? tr.match(/class="redValue">R\$\s*([^<]+)</i)?.[1];
        const melhorLance = melhorRaw ? parseFloat(String(melhorRaw).replace(",", ".")) : null;
        const situacao = tr.match(/data-status="([^"]+)"/i)?.[1] ?? (tr.includes("icoHabilitacao") ? "arrematante-declarado" : "");
        // Tempo igual ao portal: regressiva = horaFechamento - horaAtual (JS processarTimer);
        // o HTML estático traz "--" porque o countdown é preenchido via JS no browser.
        const horaFechamento = tr.match(/<input[^>]*name="horaFechamento"[^>]*value="([^"]+)"/i)?.[1] ?? null;
        const horaInicio = tr.match(/<input[^>]*name="horaInicio"[^>]*value="([^"]+)"/i)?.[1] ?? null;
        let tempo = "";
        if (horaFechamento && horaAtualSegs != null) {
            const diff = parseHoraSegs(horaFechamento) - horaAtualSegs;
            if (diff > 0)
                tempo = fmtRegressiva(diff);
        }
        else if (horaInicio && horaAtualSegs != null) {
            const diff = horaAtualSegs - parseHoraSegs(horaInicio);
            if (diff > 0)
                tempo = fmtRegressiva(diff);
        }
        if (!tempo) {
            const rawTi = tr.match(/class="[^"]*timeItem[^"]*"[^>]*>\s*([^<]+?)\s*</i)?.[1]?.trim();
            const raw60m = tr.match(/<td class="td60[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
            const raw60 = raw60m.replace(/<[^>]+>/g, " ").trim();
            tempo = (rawTi || raw60 || "").trim();
            if (!tempo || tempo === "--") {
                const anyTime = tr.match(/(\d{1,3}:\d{2}:\d{2})/)?.[1] ?? tr.match(/data-countdown="([^"]+)"/i)?.[1] ?? tr.match(/data-remaining="([^"]+)"/i)?.[1] ?? "";
                if (/^\d{1,3}:\d{2}(:\d{2})?$/.test(anyTime.trim()))
                    tempo = anyTime.trim();
            }
            if (tempo === "--" || !/^\d{1,3}:\d{2}(:\d{2})?$/.test(tempo))
                tempo = "";
        }
        const formAction = tr.match(/<form[^>]*action\s*=\s*"([^"]+)"/i)?.[1];
        const temFormLance = /name="ttPRECO_UNITARIO"/i.test(tr) || /formInsertValue/i.test(tr) || !!formAction;
        const stateTitle = tr.match(/class="stateIMGLink"[^>]*title="([^"]+)"/i)?.[1] ?? tr.match(/title="([^"]*Sua posi[^"]+)"/i)?.[1] ?? "";
        let posicaoRaw = null;
        if (stateTitle) {
            const pm = stateTitle.match(/Sua posi[^:]*:\s*([^\n"]+)/i);
            if (pm)
                posicaoRaw = pm[1].trim();
            else if (/desclassificado/i.test(stateTitle))
                posicaoRaw = "Desclassificado";
        }
        const posicao = parsePosicaoNumero(posicaoRaw);
        const estaVencendo = tr.includes("icoGanhando.png") ? true : tr.includes("icoPerdendo.png") ? false : null;
        const autorMelhor = /Sua proposta[^<]*melhor/i.test(stateTitle) ? "eu" : /concorrente/i.test(stateTitle) ? "concorrente" : null;
        const rankingRaw = tr.match(/href="([^"]*RankingItem[^"]+)"/i)?.[1] ?? null;
        const historicoRaw = tr.match(/href="([^"]*SeusLances[^"]+)"/i)?.[1] ?? null;
        const rankingUrl = rankingRaw ? rankingRaw.replace(/&amp;/g, "&") : null;
        const historicoUrl = historicoRaw ? historicoRaw.replace(/&amp;/g, "&") : null;
        const qtdRaw = tr.match(/<td class="td150"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i)?.[1]?.trim();
        let qtdLances = null;
        if (qtdRaw && qtdRaw !== "--" && qtdRaw !== "") {
            const n = parseInt(qtdRaw.replace(/\D/g, ""), 10);
            if (!isNaN(n))
                qtdLances = n;
        }
        const meuRaw = stateTitle.match(/Sua melhor proposta:\s*R\$\s*([\d\.\,]+)/i)?.[1] ?? null;
        const meuLance = meuRaw ? parseFloat(meuRaw.replace(/\./g, "").replace(",", ".")) : null;
        itens.push({ id, numero, descricao, referencia, melhorLance, situacao, tempo, temFormLance, formAction, posicaoRaw, posicao, estaVencendo, rankingUrl, historicoUrl, qtdLances, autorMelhor, horaFechamento, meuLance: meuLance != null && !isNaN(meuLance) ? meuLance : null });
    }
    if (!itens.length) {
        const alt = /id="lstLances(\d+)"/gi;
        while ((m = alt.exec(html))) {
            const id = m[1];
            if (!itens.find(x => x.id === id))
                itens.push({ id, numero: "", descricao: "", referencia: null, melhorLance: null, situacao: "", temFormLance: false, posicaoRaw: null, posicao: null, estaVencendo: null, rankingUrl: null, historicoUrl: null, qtdLances: null, autorMelhor: null });
        }
    }
    return itens;
}
const actionCache = new Map();
const rankingCache = new Map();
async function fetchRanking(cnpj, licitacaoId, itemId, opts) {
    const key = `${cnpj}:${licitacaoId}:${itemId}`;
    const cached = rankingCache.get(key);
    const ttl = opts?.maxAgeMs ?? 1200;
    if (cached && Date.now() - cached.at < ttl)
        return cached.data;
    const url = `${BASE_OP}/4/SessaoPublica/RankingItem/?ttCD_CHAVE=${itemId}&slCD_ORIGEM=${licitacaoId}&iframe=True&_=${Date.now()}`;
    try {
        const r = await (0, auth_1.fetchWithJar)(cnpj, url, { headers: { Accept: "text/html" } });
        const html = await decodeHtml(r);
        if (isExpiredBody(html) || !html)
            return { posicoes: [], raw: html.slice(0, 2000) };
        const posicoes = [];
        const reRow = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let m;
        while ((m = reRow.exec(html))) {
            const row = m[1];
            if (!row.includes("R$"))
                continue;
            const posM = row.match(/<td[^>]*>\s*(\d+)[ºo]?\s*</i) ?? row.match(/>\s*(\d+)\s*<\/td>/);
            const valorM = row.match(/R\$\s*([\d\.\,]+)/);
            if (!valorM)
                continue;
            const valor = parseFloat(valorM[1].replace(/\./g, "").replace(",", "."));
            if (isNaN(valor))
                continue;
            const pos = posM ? parseInt(posM[1], 10) : posicoes.length + 1;
            const forn = row.match(/title="([^"]+)"/)?.[1]?.trim();
            posicoes.push({ pos, valor, fornecedor: forn });
        }
        posicoes.sort((a, b) => a.pos - b.pos);
        const res = { posicoes, raw: html.slice(0, 8000) };
        rankingCache.set(key, { at: Date.now(), data: res });
        return res;
    }
    catch {
        return { posicoes: [], raw: "" };
    }
}
async function fetchHistorico(cnpj, licitacaoId, itemId) {
    const url = `${BASE_OP}/4/SessaoPublica/SeusLances/?ttCD_CHAVE=${itemId}&slCD_ORIGEM=${licitacaoId}&iframe=True&_=${Date.now()}`;
    try {
        const r = await (0, auth_1.fetchWithJar)(cnpj, url, { headers: { Accept: "text/html" } });
        const html = await decodeHtml(r);
        if (isExpiredBody(html) || !html)
            return { lances: [], raw: "" };
        const lances = [];
        let m;
        const reRow = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        while ((m = reRow.exec(html))) {
            const row = m[1];
            const vM = row.match(/R\$\s*([\d\.\,]+)/);
            if (!vM)
                continue;
            const v = parseFloat(vM[1].replace(/\./g, "").replace(",", "."));
            if (!isNaN(v))
                lances.push({ valor: v });
        }
        return { lances, raw: html.slice(0, 8000) };
    }
    catch {
        return { lances: [], raw: "" };
    }
}
/** Respostas do portal que PARECEM ok mas na verdade rejeitaram o lance. */
function isLanceRejeitado(t) {
    if (!t)
        return false;
    return /intervalo entre os lances/i.test(t)
        || /diferen[cç]a de R\$/i.test(t)
        || /sobre o seu lance atual/i.test(t)
        || /n[aã]o deve ser inferior a/i.test(t)
        || /lance vencedor enviado em/i.test(t)
        || /n[aã]o est[aá] recebendo lances/i.test(t)
        || /item sem campo de lance/i.test(t)
        || /aguarde a abertura/i.test(t);
}
function avaliaRespostaLance(r, t) {
    let msg = "";
    try {
        const j = JSON.parse(t);
        msg = j.mensagem ?? j.msg ?? t.slice(0, 400);
    }
    catch {
        msg = t.slice(0, 600);
    }
    if (isLanceRejeitado(msg))
        return { ok: false, mensagem: msg };
    const ok = r.ok && !/erro|inv[aá]lido|falha/i.test(msg);
    if (ok)
        return { ok, mensagem: msg };
    if (/sucesso/i.test(t) || /lance.*registrado/i.test(t))
        return { ok: true, mensagem: msg };
    return { ok, mensagem: msg };
}
async function enviarLanceViaFetch(cnpj, licitacaoId, itemId, valor) {
    const cacheKey = `${cnpj}:${licitacaoId}:${itemId}`;
    const cached = actionCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 300000) {
        try {
            const valorStr = valor.toFixed(2).replace(".", ",");
            const body = `ttCD_CHAVE=${licitacaoId}&slCD_ORIGEM=${itemId}&ttPRECO_UNITARIO=${encodeURIComponent(valorStr)}&ttCD_LICITACAO=${licitacaoId}&ttCD_ITEM_LICITACAO=${itemId}&btGravar=sim`;
            const r2 = await (0, auth_1.fetchWithJar)(cnpj, cached.action, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json, text/html" }, body });
            const t2 = await decodeHtml(r2);
            if (r2.status === 404 || t2.includes("tabTableSorter"))
                actionCache.delete(cacheKey);
            else if (!isExpiredBody(t2) && t2.length > 50) {
                if ((0, auth_1.isWafBody)(t2)) {
                    actionCache.delete(cacheKey);
                    return { ok: false, mensagem: "bloqueio WAF/captcha do portal — resolva manualmente e reconecte", raw: t2.slice(0, 400) };
                }
                const av = avaliaRespostaLance(r2, t2);
                if (av.ok)
                    return { ok: true, mensagem: av.mensagem, raw: t2.slice(0, 800) };
                // Rejeição explícita (ex: intervalo 3s) não deve cair no form parse — retorna direto
                if (isLanceRejeitado(t2) || isLanceRejeitado(av.mensagem))
                    return { ok: false, mensagem: av.mensagem, raw: t2.slice(0, 800) };
            }
        }
        catch { }
    }
    let html = "";
    for (const pr of [1, 0]) {
        html = await obterHtmlAba(cnpj, licitacaoId, pr).catch(() => "");
        if (html && html.includes('id="item'))
            break;
    }
    if (!html)
        return { ok: false, mensagem: "sessão expirada ou item não encontrado — relogue", raw: "" };
    // Extrai o bloco <form>...</form> do item (portal usa `action = "..."` com espaços,
    // endpoint real /4/SessaoPublica/SubmeterLance/, botão btGravar, hidden ttCD_CHAVE/slCD_ORIGEM/ttUsuarioAtivo)
    const escId = String(itemId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reFormBlock = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;
    function findItemForm(h) {
        let m;
        reFormBlock.lastIndex = 0;
        while ((m = reFormBlock.exec(h))) {
            const open = h.slice(Math.max(0, m.index - 400), m.index);
            const tagStart = open.lastIndexOf("<form");
            const tag = open.slice(tagStart);
            const inner = m[1];
            const hasId = new RegExp(`name\\s*=\\s*"slCD_ORIGEM"[^>]*value\\s*=\\s*"0*${escId}"`, "i").test(inner)
                || new RegExp(`value\\s*=\\s*"0*${escId}"[^>]*name\\s*=\\s*"slCD_ORIGEM"`, "i").test(inner);
            if (!hasId)
                continue;
            const act = tag.match(/action\s*=\s*"([^"]+)"/i)?.[1];
            if (act)
                return { action: act, inner };
        }
        return null;
    }
    let found = findItemForm(html);
    let action = found?.action;
    if (!action) {
        for (let p = 2; p <= 6; p++) {
            const h2 = await obterHtmlAba(cnpj, licitacaoId, 1, p, 1).catch(() => "");
            if (!h2)
                break;
            const f2 = findItemForm(h2);
            if (f2) {
                html = h2;
                found = f2;
                action = f2.action;
                break;
            }
            if (!h2.includes('id="item'))
                break;
        }
    }
    const foundForm = /<form[^>]*class="formInsertValue"/i.test(html) || /name="ttPRECO_UNITARIO"/i.test(html);
    if (!action) {
        const f = html.match(/<form[^>]*class="formInsertValue"[^>]*action\s*=\s*"([^"]+)"/i)?.[1];
        action = f ?? html.match(/<form[^>]*action\s*=\s*"([^"]+)"[^>]*>/i)?.[1];
        if (action)
            found = { action, inner: "" };
    }
    if (!action || !foundForm) {
        return { ok: false, mensagem: "item sem campo de lance no portal (fechado/encerrado ou ainda não aberto) — aguarde a abertura", raw: "" };
    }
    // Monta o body como o JS do portal (obterDadosFormularioPregao): todos os hidden do form + preço + botão
    const valorStr = valor.toFixed(2).replace(".", ",");
    const params = new URLSearchParams();
    if (found?.inner) {
        const reInp = /<input\b[^>]*>/gi;
        let im;
        while ((im = reInp.exec(found.inner))) {
            const tag = im[0];
            if (/type\s*=\s*"submit"/i.test(tag))
                continue;
            const nm = tag.match(/name\s*=\s*"([^"]+)"/i)?.[1];
            if (!nm || nm === "ttPRECO_UNITARIO")
                continue;
            const vv = tag.match(/value\s*=\s*"([^"]*)"/i)?.[1] ?? "";
            params.set(nm, vv);
        }
    }
    if (!params.has("ttCD_CHAVE"))
        params.set("ttCD_CHAVE", String(licitacaoId));
    if (!params.has("slCD_ORIGEM"))
        params.set("slCD_ORIGEM", String(itemId));
    params.set("ttPRECO_UNITARIO", valorStr);
    // nome do botão submit do form (portal: btGravar) + "=sim"
    const btnName = found?.inner?.match(/<input[^>]*type\s*=\s*"submit"[^>]*name\s*=\s*"([^"]+)"/i)?.[1]
        ?? found?.inner?.match(/<input[^>]*name\s*=\s*"([^"]+)"[^>]*type\s*=\s*"submit"/i)?.[1] ?? "btGravar";
    params.set(btnName, "sim");
    if (!params.has("ttCD_ITEM_LICITACAO"))
        params.set("ttCD_ITEM_LICITACAO", String(itemId));
    if (!params.has("ttCD_LICITACAO"))
        params.set("ttCD_LICITACAO", String(licitacaoId));
    const body = params.toString();
    const resolveAction = (a) => {
        if (/^https?:\/\//i.test(a))
            return a;
        if (a.startsWith("/4/"))
            return `${BASE_OP}${a}`;
        if (a.startsWith("/"))
            return `${BASE_OP}${a}`;
        if (a.startsWith("4/"))
            return `${BASE_OP}/${a}`;
        return `${BASE_OP}/4/SessaoPublica/${a.replace(/^\//, "")}`;
    };
    let resolved = resolveAction(action);
    actionCache.set(cacheKey, { action: resolved, at: Date.now() });
    const candidates = [resolved];
    const tried = new Set();
    for (const cand of candidates) {
        if (tried.has(cand))
            continue;
        tried.add(cand);
        try {
            const r = await (0, auth_1.fetchWithJar)(cnpj, cand, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json, text/html", Referer: `${BASE_OP}/4/SessaoPublica/?ttCD_CHAVE=${licitacaoId}` }, body });
            const t = await decodeHtml(r);
            if (isExpiredBody(t))
                return { ok: false, mensagem: "sessão expirada", raw: t.slice(0, 400) };
            if (r.status === 404) {
                actionCache.delete(cacheKey);
                return { ok: false, mensagem: `endpoint do portal mudou (404 em ${cand}) — avise o suporte com este código`, raw: t.slice(0, 400) };
            }
            if (t.includes("tabTableSorter") || t.includes('id="item')) {
                actionCache.delete(cacheKey);
                return { ok: false, mensagem: `portal devolveu a lista de itens em vez de confirmar (${cand}) — action do form inválido`, raw: t.slice(0, 400) };
            }
            if ((0, auth_1.isWafBody)(t)) {
                actionCache.delete(cacheKey);
                return { ok: false, mensagem: "bloqueio WAF/captcha do portal — resolva manualmente e reconecte", raw: t.slice(0, 400) };
            }
            const av = avaliaRespostaLance(r, t);
            return { ok: av.ok, mensagem: av.mensagem, raw: t.slice(0, 800) };
        }
        catch (e) {
            return { ok: false, mensagem: `${cand}: ${e.message}`, raw: "" };
        }
    }
    return { ok: false, mensagem: "falha ao enviar lance", raw: "" };
}
async function enviarLanceViaDOM(page, itemId, valor) {
    const valorStr = valor.toFixed(2).replace(".", ",");
    const input = page.locator(`#item${itemId} input[name="ttPRECO_UNITARIO"], input[name="slCD_ORIGEM"][value="${itemId}"] ~ input[name="ttPRECO_UNITARIO"], input[name="ttPRECO_UNITARIO"]`).first();
    try {
        if (await input.count() === 0) {
            const anyInput = page.locator('input[name="ttPRECO_UNITARIO"]').first();
            if (await anyInput.count() === 0)
                return { ok: false, mensagem: "input ttPRECO_UNITARIO não encontrado" };
            await anyInput.click({ delay: 80 });
            await anyInput.fill(valorStr);
            const btn = page.locator('form.formInsertValue input[type="submit"], form.formInsertValue button:has-text("Enviar")').first();
            await btn.click({ delay: 80 });
        }
        else {
            await input.click({ delay: 80 });
            await input.fill("");
            await input.fill(valorStr);
            await page.keyboard.press("Tab");
            const submit = page.locator(`#item${itemId} input[type="submit"], #item${itemId} button`).first();
            if (await submit.count())
                await submit.click({ delay: 80 });
            else {
                const formEl = page.locator(`#item${itemId} form`).first();
                if (await formEl.count())
                    await formEl.evaluate((f) => f.submit());
            }
        }
        await page.waitForTimeout(1500);
        const alertText = await page.locator(".shadeBlock, .alertBlock, #liveSessionMessage").first().textContent().catch(() => null);
        if (alertText && /sucesso/i.test(alertText))
            return { ok: true, mensagem: alertText.trim().slice(0, 300) };
        if (alertText && /erro|inválid/i.test(alertText))
            return { ok: false, mensagem: alertText.trim().slice(0, 400) };
        return { ok: true, mensagem: "enviado (sem confirmação visual)" };
    }
    catch (e) {
        return { ok: false, mensagem: e.message?.slice(0, 400) ?? String(e) };
    }
}
async function attachSessaoPolling(page, licitacaoId, cbs) {
    page.on("response", async (r) => {
        const u = r.url();
        if (u.includes("/fornecedor/processo/") && u.includes("/chat")) {
            try {
                const j = await r.json();
                cbs.onChat?.(j.mensagens ?? []);
            }
            catch { }
        }
        if (u.includes("/fornecedor/processo/") && u.includes("/operacao")) {
            try {
                const t = await r.text();
                cbs.onStatus?.(t.trim());
            }
            catch { }
        }
        if (u.includes("apipcp") && u.includes("/hora")) {
            try {
                const t = await r.text();
                const d = new Date(t);
                if (!isNaN(d.getTime()))
                    cbs.onHora?.(d);
            }
            catch { }
        }
        if (u.includes("htmlAba.asp") || u.includes("htmlLance.asp")) {
            try {
                const t = await r.text();
                const itens = parseItens(t);
                if (itens.length)
                    cbs.onItens?.(itens);
            }
            catch { }
        }
    });
    await page.route("**/apipcp.portaldecompraspublicas.com.br/**", async (route) => route.continue());
}
//# sourceMappingURL=sessao.js.map