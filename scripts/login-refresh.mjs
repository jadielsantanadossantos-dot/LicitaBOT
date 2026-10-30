import { chromium } from "playwright";
import fs from "fs";
import path from "path";
const env = Object.fromEntries(fs.readFileSync(".env","utf8").split("\n").filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim()]}));
const USER=env.PORTAL_USER, PASS=env.PORTAL_PASS, CNPJ=env.PORTAL_CNPJ;
console.log(`login ${USER} cnpj=${CNPJ}`);
const browser = await chromium.launch({ headless:false, args:["--disable-blink-features=AutomationControlled"]});
const ctx = await browser.newContext({ viewport:{width:1280,height:800}});
const page = await ctx.newPage();
await page.goto("https://operacao.portaldecompraspublicas.com.br/18/loginext/", {waitUntil:"domcontentloaded", timeout:60000});
await page.waitForTimeout(1500);
console.log("url before", page.url());
await page.fill("#username", USER);
await page.fill("#password", PASS);
await page.click("#kc-login");
console.log("submitted");
try{ await page.waitForURL(u=> u.href.includes("operacao.portaldecompraspublicas.com.br") && !u.href.includes("/realms/"), {timeout:30000}); }catch(e){ console.log("wait url timeout", e.message);}
await page.waitForTimeout(3000);
console.log("url after", page.url());
console.log("title", await page.title());
await ctx.storageState({ path: `storage/${CNPJ}.json`});
console.log("saved storage/"+CNPJ+".json");
try{ fs.mkdirSync("apps/api/storage",{recursive:true}); fs.copyFileSync(`storage/${CNPJ}.json`, `apps/api/storage/${CNPJ}.json`); console.log("copied to apps/api/storage"); }catch(e){ console.log(e.message)}
await browser.close();
console.log("done");
