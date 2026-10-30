import { chromium } from "playwright";
import fs from "fs";
const CNPJ="32977510000100";
const ctx = await chromium.launchPersistentContext(`storage/pw-${CNPJ}`, { headless:false, args:["--disable-blink-features=AutomationControlled"] });
let page = ctx.pages()[0] ?? await ctx.newPage();
const logs=[];
page.on("response", async r=>{
  const u=r.url();
  if(u.includes("portaldecompraspublicas") && !u.includes("analytics") && !u.includes("googletag") && !u.includes("facebook") && !u.includes("tiktok") && !u.includes("hotjar") && !u.includes("s3.")){
    try{
      const ct=r.headers()["content-type"]||"";
      let body="";
      if(ct.includes("json")||ct.includes("text")||u.includes("apipcp")||u.includes("/4/")) body=(await r.text()).slice(0,3000);
      logs.push(`RES ${r.status()} ${r.request().method()} ${u}\nCT:${ct}\n${body.slice(0,2000)}\n---`);
    }catch(e){ logs.push(`RES ${r.status()} ${u} err ${e.message}`)}
  }
});
page.on("request", r=>{
  const u=r.url();
  if(u.includes("portaldecompraspublicas") && !u.includes("analytics") && !u.includes("s3.")) logs.push(`REQ ${r.method()} ${u}`);
});
page.on("websocket", ws=>{
  logs.push(`WS OPEN ${ws.url()}`);
  ws.on("framereceived", ({payload})=> logs.push(`WS RCV ${String(payload).slice(0,1200)}`));
  ws.on("framesent", ({payload})=> logs.push(`WS SEND ${String(payload).slice(0,800)}`));
});
console.log("Goto Dashboard");
await page.goto("https://operacao.portaldecompraspublicas.com.br/4/DashBoard/", {waitUntil:"domcontentloaded", timeout:60000});
await page.waitForTimeout(5000);
console.log("url", page.url());
console.log("title", await page.title());
fs.writeFileSync("map-deep-dashboard.html", await page.content());
console.log("try goto Pregoes");
await page.goto("https://operacao.portaldecompraspublicas.com.br/4/Pregoes/", {waitUntil:"domcontentloaded"}).catch(e=>console.log(e.message));
await page.waitForTimeout(5000);
fs.writeFileSync("map-deep-pregoes.html", await page.content());
console.log("try goto SessaoPublica 504989");
await page.goto("https://operacao.portaldecompraspublicas.com.br/4/SessaoPublica/?ttCD_CHAVE=504989", {waitUntil:"domcontentloaded"}).catch(e=>console.log(e.message));
await page.waitForTimeout(8000);
fs.writeFileSync("map-deep-sessao.html", await page.content());
console.log("collect logs", logs.length);
fs.writeFileSync("map-deep.log", logs.join("\n"));
console.log(logs.slice(0,80).join("\n").slice(0,8000));
await page.waitForTimeout(10000);
console.log("done");
