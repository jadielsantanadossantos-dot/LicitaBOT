// Uso: node scripts/resolver-waf.mjs <CNPJ>
// Abre o portal em janela VISÍVEL para você resolver o captcha "você é humano"
// (e logar, se preciso). Quando a sessão validar, salva os cookies onde a API lê.
// Rode na máquina onde a API está rodando. Não digite a senha em terminal — use a janela.
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const cnpj = String(process.argv[2] || "").replace(/\D/g, "");
if (cnpj.length !== 14) { console.error("Uso: node scripts/resolver-waf.mjs <CNPJ com 14 dígitos>"); process.exit(1); }

const apiStorage = path.resolve("apps/api/storage", `${cnpj}.json`);
const rootStorage = path.resolve("storage", `${cnpj}.json`);
const profileDir = path.resolve(`storage/pw-${cnpj}`);

function isWaf(t) {
  return /Human Verification/i.test(t) || /você é humano/i.test(t) || /awsWafCookieDomainList|gokuProps/i.test(t);
}

async function sessaoOk(ctx) {
  try {
    const st = await ctx.storageState();
    const ck = (st.cookies || []).map((c) => `${c.name}=${c.value}`).join("; ");
    if (!ck) return false;
    const r = await fetch("https://operacao.portaldecompraspublicas.com.br/4/DashBoard/", {
      headers: {
        Cookie: ck,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      redirect: "manual",
    });
    if (r.status === 200) return true;
    const t = await r.text().catch(() => "");
    if (isWaf(t)) { console.log("  ... ainda com captcha WAF"); return false; }
    return false;
  } catch { return false; }
}

(async () => {
  fs.mkdirSync(path.dirname(apiStorage), { recursive: true });
  // NÃO apaga nada: reaproveita cookies existentes (só falta passar no captcha)
  let storageState;
  for (const p of [apiStorage, rootStorage]) {
    if (fs.existsSync(p)) { storageState = p; break; }
  }
  console.log("storage base:", storageState ?? "(nenhum — vai logar do zero)");
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    storageState: storageState,
    viewport: { width: 1360, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto("https://operacao.portaldecompraspublicas.com.br/18/loginext/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  console.log("\n=== AÇÃO NECESSÁRIA ===");
  console.log("1. Na janela que abriu, clique Iniciar e resolva o 'você é humano'");
  console.log("2. Se cair no login, entre com e-mail/senha da empresa");
  console.log("Aguardando até 10 min pela sessão válida...\n");
  const fim = Date.now() + 10 * 60 * 1000;
  let ok = false;
  while (Date.now() < fim) {
    await new Promise((r) => setTimeout(r, 5000));
    if (await sessaoOk(ctx)) { ok = true; break; }
  }
  if (!ok) { console.error("Tempo esgotado sem sessão válida. Tente de novo."); await ctx.close(); process.exit(2); }
  const st = await ctx.storageState();
  fs.writeFileSync(apiStorage, JSON.stringify(st, null, 2));
  fs.writeFileSync(rootStorage, JSON.stringify(st, null, 2));
  console.log(`OK — sessão salva em:\n  ${apiStorage}\n  ${rootStorage}\nVolte ao dashboard e reconecte em Empresas → Conectar.`);
  await ctx.close();
})().catch((e) => { console.error("ERRO", e.message); process.exit(1); });
