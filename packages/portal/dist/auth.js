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
exports.storagePathFor = storagePathFor;
exports.ensureStorageDir = ensureStorageDir;
exports.loadStorage = loadStorage;
exports.saveStorage = saveStorage;
exports.clearStorage = clearStorage;
exports.getCookiesHeader = getCookiesHeader;
exports.getCookiesHeaderForUrl = getCookiesHeaderForUrl;
exports.updateCookiesFromHeaders = updateCookiesFromHeaders;
exports.fetchWithJar = fetchWithJar;
exports.createContextForCNPJ = createContextForCNPJ;
exports.loginWithCredentials = loginWithCredentials;
exports.loginIfNeeded = loginIfNeeded;
exports.isSessionValid = isSessionValid;
exports.checkSessao = checkSessao;
exports.isWafBody = isWafBody;
exports.ensureSession = ensureSession;
const playwright_1 = require("playwright");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const BASE = "https://operacao.portaldecompraspublicas.com.br";
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
];
function getUserAgentFor(cnpj) {
    const hash = cnpj.replace(/\D/g, "");
    const idx = parseInt(hash.slice(-1)) % USER_AGENTS.length;
    return USER_AGENTS[idx];
}
const LOGIN_PATH = "/18/loginext/";
function resolveStorageDir() {
    const candidates = [path.resolve("storage"), path.resolve("../storage"), path.resolve("../../storage"), path.resolve("apps/api/storage"), path.resolve("D:/Jadiel/Projetos/LicitaBOT/storage")];
    for (const c of candidates) {
        try {
            if (fs.existsSync(c))
                return c;
        }
        catch { }
    }
    return path.resolve("storage");
}
function storagePathFor(cnpj) {
    const dir = resolveStorageDir();
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${cnpj.replace(/\D/g, "")}.json`);
}
async function ensureStorageDir() {
    await fs.promises.mkdir(resolveStorageDir(), { recursive: true });
}
function loadStorage(cnpj) {
    const sp = storagePathFor(cnpj.replace(/\D/g, ""));
    if (!fs.existsSync(sp))
        return null;
    try {
        return JSON.parse(fs.readFileSync(sp, "utf8"));
    }
    catch {
        return null;
    }
}
function saveStorage(cnpj, data) {
    const sp = storagePathFor(cnpj.replace(/\D/g, ""));
    fs.mkdirSync(path.dirname(sp), { recursive: true });
    fs.writeFileSync(sp, JSON.stringify(data, null, 2));
    const alt = path.resolve("apps/api/storage", `${cnpj.replace(/\D/g, "")}.json`);
    try {
        fs.mkdirSync(path.dirname(alt), { recursive: true });
        fs.writeFileSync(alt, JSON.stringify(data, null, 2));
    }
    catch { }
    const alt2 = path.resolve("storage", `${cnpj.replace(/\D/g, "")}.json`);
    try {
        fs.writeFileSync(alt2, JSON.stringify(data, null, 2));
    }
    catch { }
}
function clearStorage(cnpj) {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const paths = [
        storagePathFor(cleanCnpj),
        path.resolve("apps/api/storage", `${cleanCnpj}.json`),
        path.resolve("storage", `${cleanCnpj}.json`),
        path.resolve(`storage/pw-${cleanCnpj}`) // Pasta do contexto persistente do Playwright
    ];
    paths.forEach(p => {
        try {
            if (fs.existsSync(p)) {
                if (fs.lstatSync(p).isDirectory()) {
                    fs.rmSync(p, { recursive: true, force: true });
                }
                else {
                    fs.unlinkSync(p);
                }
            }
        }
        catch (e) {
            console.error(`[auth] erro ao limpar path ${p}: ${e}`);
        }
    });
}
async function getCookiesHeader(cnpj) {
    const st = loadStorage(cnpj);
    if (!st)
        return "";
    const cookies = st.cookies ?? [];
    const seen = new Map();
    for (const c of cookies)
        seen.set(c.name, c.value);
    return [...seen.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function getCookiesHeaderForUrl(cnpj, _url) {
    return getCookiesHeaderSync(cnpj);
}
function getCookiesHeaderSync(cnpj) {
    const st = loadStorage(cnpj);
    if (!st)
        return "";
    const cookies = st.cookies ?? [];
    const seen = new Map();
    for (const c of cookies)
        seen.set(c.name, c.value);
    return [...seen.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function updateCookiesFromHeaders(cnpj, headers) {
    const raw = headers.getSetCookie ? headers.getSetCookie() : (headers.get("set-cookie") ? [headers.get("set-cookie")] : []);
    if (!raw.length)
        return;
    const st = loadStorage(cnpj) ?? { cookies: [], origins: [] };
    let changed = false;
    for (const line of raw) {
        const m = line.match(/^\s*([^=]+)=([^;]+)/);
        if (!m)
            continue;
        const name = m[1].trim(), value = m[2].trim();
        const idx = st.cookies.findIndex((c) => c.name === name);
        if (idx >= 0) {
            if (st.cookies[idx].value !== value) {
                st.cookies[idx].value = value;
                changed = true;
            }
        }
        else {
            st.cookies.push({ name, value, domain: "operacao.portaldecompraspublicas.com.br", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" });
            changed = true;
        }
    }
    if (changed)
        saveStorage(cnpj, st);
}
async function fetchWithJar(cnpj, url, init = {}) {
    const ck = getCookiesHeaderForUrl(cnpj, url);
    const headers = { ...(init.headers || {}), "User-Agent": getUserAgentFor(cnpj), Accept: init.headers?.Accept ?? "*/*" };
    if (ck)
        headers["Cookie"] = ck;
    const timeoutMs = init.timeoutMs ?? 7000;
    const sig = init.signal ?? AbortSignal.timeout(timeoutMs);
    const r = await fetch(url, { ...init, headers, redirect: init.redirect ?? "follow", signal: sig });
    try {
        updateCookiesFromHeaders(cnpj, r.headers);
    }
    catch { }
    return r;
}
async function createContextForCNPJ(cnpj, headed = true) {
    await ensureStorageDir();
    // Não apagar a sessão aqui: clearStorage só em logout explícito.
    // Reaproveita o storageState existente para manter login entre restarts.
    const sp = storagePathFor(cnpj);
    const hasState = fs.existsSync(sp);
    return playwright_1.chromium.launchPersistentContext(path.resolve(`storage/pw-${cnpj.replace(/\D/g, "")}`), {
        headless: !headed,
        storageState: hasState ? sp : undefined,
        viewport: { width: 1360, height: 900 },
        args: ["--disable-blink-features=AutomationControlled"],
    });
}
async function resolveCredentials(cnpj, username, password) {
    if (username && password)
        return { u: username, p: password };
    const cs = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
    if (cs) {
        try {
            const { Pool } = await Promise.resolve().then(() => __importStar(require("pg")));
            const pool = new Pool({ connectionString: cs, ssl: cs.includes("supabase.co") ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 8000 });
            const r = await pool.query("select portal_user, portal_pass from cnpj_contas where cnpj=$1", [cnpj.replace(/\D/g, "")]);
            await pool.end().catch(() => { });
            const row = r.rows[0];
            if (row?.portal_user && row?.portal_pass)
                return { u: row.portal_user, p: row.portal_pass };
        }
        catch { }
    }
    const envPath = path.resolve(".env");
    let env = {};
    if (fs.existsSync(envPath))
        env = Object.fromEntries(fs.readFileSync(envPath, "utf8").split("\n").filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    const eu = username ?? env.PORTAL_USER;
    const ep = password ?? env.PORTAL_PASS;
    if (eu && ep)
        return { u: eu, p: ep };
    return null;
}
async function loginWithCredentials(cnpj, username, password) {
    try {
        if (await isSessionValid(cnpj))
            return true;
        const cred = await resolveCredentials(cnpj, username, password);
        if (!cred) {
            console.log(`[auth] sem credenciais para ${cnpj}`);
            return false;
        }
        const u = cred.u;
        const p = cred.p;
        const browser = await playwright_1.chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"] });
        const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await ctx2.newPage();
        await page.goto(`${BASE}${LOGIN_PATH}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(1500);
        const hasUser = await page.locator("#username, input[name='username']").first().isVisible().catch(() => false);
        if (!hasUser) {
            const url = page.url();
            const already = url.includes("operacao.portaldecompraspublicas.com.br") && !url.includes("/realms/");
            if (already) {
                await ctx2.storageState({ path: storagePathFor(cnpj) });
                await browser.close();
                return true;
            }
        }
        await page.waitForSelector("#username, input[name='username']", { timeout: 10000 }).catch(() => { });
        await page.fill("#username", u).catch(async () => { await page.fill("input[name='username']", u); });
        await page.fill("#password", p).catch(async () => { await page.fill("input[name='password']", p); });
        await page.click("#kc-login").catch(async () => { await page.click("button[type='submit']"); });
        await page.waitForTimeout(2000);
        const errText = await page.locator(".pf-v5-c-alert, .alert-error, #input-error, [class*='error']").first().textContent().catch(() => null);
        if (errText && /inv[aá]lid|incorret|erro|usu[aá]rio|senha/i.test(errText)) {
            console.log(`[auth] login erro portal: ${errText.slice(0, 200)}`);
            await browser.close();
            return false;
        }
        await page.waitForURL(u2 => u2.href.includes("operacao.portaldecompraspublicas.com.br") && !u2.href.includes("/realms/"), { timeout: 30000 }).catch(() => { });
        await page.waitForTimeout(2500);
        const urlFinal = page.url();
        const ok = urlFinal.includes("operacao.portaldecompraspublicas.com.br") && !urlFinal.includes("/realms/");
        if (ok)
            await ctx2.storageState({ path: storagePathFor(cnpj) });
        else {
            const body = await page.content().catch(() => "");
            if (body.includes("kc-form-login"))
                console.log(`[auth] ainda no login para ${cnpj} url=${urlFinal.slice(0, 120)}`);
        }
        await browser.close();
        if (ok)
            return true;
        return await isSessionValid(cnpj);
    }
    catch (e) {
        console.log(`[auth] login exception ${cnpj}: ${e.message?.slice(0, 200)}`);
        return await isSessionValid(cnpj).catch(() => false);
    }
}
async function loginIfNeeded(ctx, username, password, cnpj) {
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.goto(`${BASE}${LOGIN_PATH}`, { waitUntil: "domcontentloaded" });
    const needsLogin = await page.locator('#username, input[name="username"]').first().isVisible().catch(() => false);
    if (!needsLogin)
        return page;
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('#kc-login');
    await page.waitForURL((u) => u.href.includes("operacao.portaldecompraspublicas.com.br") && !u.href.includes("/realms/"), { timeout: 30000 });
    await ctx.storageState({ path: storagePathFor(cnpj) });
    return page;
}
async function isSessionValid(cnpj) {
    return (await checkSessao(cnpj)) === "ok";
}
/** Distingue sessão válida de expirada e de bloqueio WAF/captcha (que exige ação humana). */
async function checkSessao(cnpj) {
    const ck = await getCookiesHeader(cnpj);
    if (!ck)
        return "expired";
    try {
        // DashBoard às vezes demora ~7s+ (sessão fria); timeout curto gerava falso "expirada" + relogin em loop
        const r = await fetchWithJar(cnpj, `${BASE}/4/DashBoard/`, { redirect: "manual", timeoutMs: 15000 });
        if (r.status === 200)
            return "ok";
        const loc = r.headers.get("location") || "";
        if (loc.includes("Logout") || loc.includes("LoginExt"))
            return "expired";
        const ct = r.headers.get("content-type") || "";
        const buf = await r.arrayBuffer().catch(() => null);
        const t = buf ? (ct.toLowerCase().includes("iso-8859") ? new TextDecoder("iso-8859-1").decode(buf) : new TextDecoder("utf-8").decode(buf)) : "";
        if (isWafBody(t))
            return "waf";
        if (t.includes("Entrar em Portal") && t.includes("kc-form-login"))
            return "expired";
        return r.status === 200 ? "ok" : "expired";
    }
    catch {
        return "expired";
    }
}
function isWafBody(t) {
    if (!t)
        return false;
    return /Human Verification/i.test(t) || /você é humano/i.test(t) || /awsWafCookieDomainList|gokuProps/i.test(t) || (/verificaç[aã]o de seguran[cç]a/i.test(t) && /Iniciar/i.test(t));
}
async function ensureSession(cnpj) {
    if (await isSessionValid(cnpj))
        return true;
    const ok = await loginWithCredentials(cnpj);
    if (!ok)
        return false;
    return await isSessionValid(cnpj);
}
//# sourceMappingURL=auth.js.map