import fs from "fs";
const html = fs.readFileSync("map-page.html","utf8");
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).slice(0,120);
console.log("HREFS:\n"+hrefs.join("\n"));
console.log("\n--- script src ---");
const srcs = [...html.matchAll(/src="([^"]+)"/g)].map(m=>m[1]).slice(0,80);
console.log(srcs.join("\n"));
console.log("\n--- apipcp/api tokens ---");
const hits = [...html.matchAll(/(apipcp[^"'\s<>]+|api[^"'\s<>]{0,80})/gi)].map(m=>m[0]);
console.log([...new Set(hits)].slice(0,80).join("\n"));
const st = JSON.parse(fs.readFileSync("storage/32977510000100.json","utf8"));
console.log("\n--- storage cookies ---");
console.log(JSON.stringify(st.cookies?.slice(0,5) ?? st, null,2).slice(0,4000));
if(fs.existsSync("map-ls.json")){
  const ls = JSON.parse(fs.readFileSync("map-ls.json","utf8"));
  console.log("\n--- localStorage keys ---");
  console.log(Object.keys(ls.local).join("\n"));
  const cand = Object.entries(ls.local).filter(([k,v])=> /token|auth|jwt|bearer|session|api/i.test(k+v)).map(([k,v])=> k+" => "+String(v).slice(0,400));
  console.log(cand.join("\n").slice(0,3000));
}
