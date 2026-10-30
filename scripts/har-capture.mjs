import { chromium } from "playwright";
import fs from "fs";
const CNPJ="32977510000100";
const storage="storage/32977510000100.json";
const st=JSON.parse(fs.readFileSync(storage,"utf8"));
const browser = await chromium.launch({ headless:false, args:["--disable-blink-features=AutomationControlled"]});
const ctx = await browser.newContext({ storageState: storage, viewport:{width:1360,height:900} });
const page = await ctx.newPage();
const logs=[];
page.on("response", async r=>{
  const u=r.url();
  if(u.includes("portaldecompraspublicas") && !u.includes("google") && !u.includes("facebook") && !u.includes("tiktok") && !u.includes("hotjar") && !u.includes("linkedin") && !u.includes("s3.amazonaws") && !u.includes("adopt") && !u.includes("amplifique") && !u.includes("zendesk")){
    const ct=r.headers()["content-type"]||"";
    let b="";
    try{ if(ct.includes("json")||ct.includes("html")||ct.includes("javascript")||u.includes("apipcp")||u.includes("/4/")) b=(await r.text()).slice(0,4000);}catch{}
    logs.push(`RES ${r.status()} ${r.request().method()} ${u}\nCT:${ct}\n${b.slice(0,2500)}\n---`);
    if(u.endsWith(".js") && b.length>0){
      const dir="har-js"; fs.mkdirSync(dir,{recursive:true});
      const name=u.replace(/[^a-zA-Z0-9]/g,"_").slice(-120)+".js";
      fs.writeFileSync(`${dir}/${name}`, b);
      if(b.toLowerCase().includes("lance")||b.toLowerCase().includes("socket")||b.toLowerCase().includes("ws")||b.toLowerCase().includes("apipcp")){
        console.log("HIT JS",u);
        console.log(b.slice(0,2000).replace(/\n/g," "));
      }
    }
  }
});
page.on("websocket", ws=>{
  logs.push(`WS OPEN ${ws.url()}`);
  ws.on("framereceived", ({payload})=> logs.push(`WS RCV ${ws.url().slice(0,100)} <= ${String(payload).slice(0,1500)}`));
  ws.on("framesent", ({payload})=> logs.push(`WS SEND ${ws.url().slice(0,100)} => ${String(payload).slice(0,1200)}`));
});
console.log("goto DashBoard with stored session");
await page.goto("https://operacao.portaldecompraspublicas.com.br/4/DashBoard/", {waitUntil:"domcontentloaded", timeout:60000});
await page.waitForTimeout(6000);
console.log("url", page.url(), "title", await page.title().catch(()=>""));
fs.writeFileSync("har-dashboard.html", await page.content());
console.log("goto Pregoes");
await page.goto("https://operacao.portaldecompraspublicas.com.br/4/Pregoes/", {waitUntil:"domcontentloaded"}).catch(e=>console.log(e.message));
await page.waitForTimeout(6000);
fs.writeFileSync("har-pregoes.html", await page.content());
console.log("goto SessaoPublica 504989");
await page.goto("https://operacao.portaldecompraspublicas.com.br/4/SessaoPublica/?ttCD_CHAVE=504989", {waitUntil:"domcontentloaded"}).catch(e=>console.log(e.message));
await page.waitForTimeout(8000);
fs.writeFileSync("har-sessao.html", await page.content());
const ls = await page.evaluate(()=> JSON.stringify({ loc: Object.fromEntries(Object.entries(localStorage).slice(0,30).map(([k,v])=>[k,String(v).slice(0,500)])), sess: Object.fromEntries(Object.entries(sessionStorage).slice(0,30).map(([k,v])=>[k,String(v).slice(0,500)])) }, null,2));
fs.writeFileSync("har-ls.json", ls);
console.log(ls.slice(0,3000));
console.log("logs", logs.length);
fs.writeFileSync("har-capture.log", logs.join("\n"));
console.log(logs.filter(l=>l.includes("apipcp")||l.includes("/api")||l.includes("WS")).slice(0,20).join("\n").slice(0,6000));
await page.waitForTimeout(5000);
await browser.close();
