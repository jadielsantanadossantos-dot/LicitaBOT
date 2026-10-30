"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
type Empresa = { cnpj: string; apelido?: string; razaoSocial?: string; portalUser?: string };
function getLastCnpj(): string {
  const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");
  try {
    const s = JSON.parse(sessionStorage.getItem("licitabot.login") || "null");
    if (s?.cnpj) return onlyDigits(s.cnpj);
  } catch {}
  try {
    const v = JSON.parse(localStorage.getItem("licitabot.login") || "null");
    if (v?.cnpj) return onlyDigits(v.cnpj);
  } catch {}
  try {
    const last = localStorage.getItem("licitabot.lastCnpj");
    if (last) return onlyDigits(last);
    const c = localStorage.getItem("licitabot.cnpj");
    if (c) return onlyDigits(c);
  } catch {}
  return "";
}
export default function LoginPage(){
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cnpj, setCnpj] = useState("");
  const [lastCnpj, setLastCnpj] = useState("");
  const [valid, setValid] = useState<Record<string,{valid:boolean,hasCookie:boolean}>>({});
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState("");
  const [logged, setLogged] = useState<{cnpj:string,nome:string}|null>(null);

  useEffect(()=>{
    const last = getLastCnpj();
    setLastCnpj(last);
    if (last) setCnpj(last);
    try{
      const sess = sessionStorage.getItem("licitabot.login");
      if(sess) setLogged(JSON.parse(sess));
      else {
        const v = localStorage.getItem("licitabot.login");
        if(v) setLogged(JSON.parse(v)); // mostra última como dica, mas exige novo login (sessão expirou ao fechar)
      }
    }catch{}
    fetch(`${API}/api/cnpjs`).then(r=>r.json()).then(j=>{
      const arr: Empresa[] = Array.isArray(j)?j:[];
      setEmpresas(arr);
      // Preseleciona: última usada > primeira da lista
      if (last && arr.some(e=> e.cnpj.replace(/\D/g,"") === last)) {
        setCnpj(arr.find(e=> e.cnpj.replace(/\D/g,"") === last)!.cnpj);
      } else if (arr[0]) {
        setCnpj((cur)=> cur || arr[0].cnpj);
      }
      for(const e of arr){
        fetch(`${API}/api/cnpjs/${e.cnpj}/valid`).then(x=>x.json()).then(v=> setValid(s=>({...s,[e.cnpj]:v}))).catch(()=>{});
      }
    }).catch(()=>{});
  },[]);

  async function entrar(cnpjSel?: string){
    const sel = (cnpjSel || cnpj).replace(/\D/g,"");
    if(!sel) return setMsg("Selecione a empresa");
    setCnpj(sel);
    setLoading(true); setLoadingCnpj(sel); setMsg("Entrando no bot...");
    try{
      const r=await fetch(`${API}/api/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cnpj: sel})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok || !j.ok) { setMsg(`❌ Empresa não encontrada: ${j.error || JSON.stringify(j).slice(0,300)}`); setLoading(false); setLoadingCnpj(""); return; }
      const sess={cnpj: j.cnpj, nome: j.nome, at:new Date().toISOString()};
      try { sessionStorage.setItem("licitabot.login", JSON.stringify(sess)); } catch {}
      localStorage.setItem("licitabot.login", JSON.stringify(sess));
      localStorage.setItem("licitabot.cnpj", j.cnpj);
      try { localStorage.setItem("licitabot.lastCnpj", j.cnpj.replace(/\D/g,"")); } catch {}
      setLogged(sess as any);
      setLastCnpj(j.cnpj.replace(/\D/g,""));
      setMsg(`✅ Bot: ${j.nome} selecionada — conectando no Portal...`);
      try{
        const rp=await fetch(`${API}/api/cnpjs/${sel}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body: JSON.stringify({})});
        const jp=await rp.json().catch(()=>({}));
        if(rp.ok && jp.ok){
          setMsg(`✅ Portal conectado como ${j.nome} (${jp.hasCookie?"sessão ok":"sem cookie"}) — entrando...`);
        } else {
          const det = jp.error || JSON.stringify(jp).slice(0,300);
          setMsg(`⚠️ Bot: ${j.nome} ok — Portal falhou: ${det}\nVerifique e-mail/senha em /empresas → Conectar`);
          setLoading(false); setLoadingCnpj("");
          return;
        }
      }catch(e:any){
        setMsg(`⚠️ Bot ok, Portal erro: ${e.message} — verifique em /empresas`);
        setLoading(false); setLoadingCnpj("");
        return;
      }
      setTimeout(()=> window.location.href="/", 600);
    }catch(e:any){ setMsg("❌ Erro: "+e.message); }
    setLoading(false); setLoadingCnpj("");
  }
  function sair(){
    try { sessionStorage.removeItem("licitabot.login"); } catch {}
    localStorage.removeItem("licitabot.login");
    // mantém licitabot.lastCnpj / licitabot.cnpj para pré-selecionar na próxima vez
    setLogged(null); setMsg("Saiu — escolha outra empresa");
  }
  const selEmpresa = empresas.find(e=> e.cnpj.replace(/\D/g,"") === cnpj.replace(/\D/g,""));
  return (
    <main style={{maxWidth:560,margin:"36px auto",padding:24}}>
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:20}}>
        <h1 style={{margin:0,fontSize:22}}>LicitaBOT — escolher empresa</h1>
        <p style={{color:"#64748b",fontSize:13,margin:"6px 0 0"}}>Selecione a empresa para usar o bot. Ao selecionar, já <b>loga automaticamente no Portal</b> com a conta dessa empresa. Lista vem de <code>/empresas</code>.</p>
        {logged && (
          <div style={{marginTop:14,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div><div style={{fontWeight:800,fontSize:13}}>Última usada: {logged.nome}</div><div style={{fontSize:11,color:"#64748b"}}>{logged.cnpj}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=> entrar(logged.cnpj)} disabled={loading} style={{padding:"8px 12px",border:"none",borderRadius:8,background:"#16a34a",color:"#fff",fontWeight:700,fontSize:12,opacity:loading?0.6:1}}>{loadingCnpj===logged.cnpj.replace(/\D/g,"")?"Conectando...":"Continuar"}</button>
              <button onClick={sair} style={{padding:"8px 12px",border:"1px solid #fecaca",borderRadius:8,background:"#fff",color:"#b91c1c",fontWeight:700,fontSize:12}}>Trocar</button>
            </div>
          </div>
        )}
        <div style={{marginTop:16,display:"grid",gap:10}}>
          <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,fontWeight:700}}>Empresa {lastCnpj ? <span style={{fontWeight:400,color:"#16a34a"}}>(pré-selecionada: última usada)</span> : null}
            <select value={cnpj} onChange={e=> entrar(e.target.value)} disabled={loading} style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10,background:"#fff"}}>
              {empresas.length ? empresas.map(e=> {
                const isLast = e.cnpj.replace(/\D/g,"") === lastCnpj;
                return <option key={e.cnpj} value={e.cnpj}>{e.razaoSocial||e.apelido||e.cnpj} — {e.cnpj}{isLast ? " ★ última" : ""}</option>;
              }) : <option value="">nenhuma empresa cadastrada</option>}
            </select>
          </label>
          {!empresas.length ? (
            <div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:10,padding:12,fontSize:13,textAlign:"center"}}>
              Nenhuma empresa cadastrada.<br/><a href="/empresas" style={{color:"#92400e",fontWeight:800}}>Cadastrar empresa →</a>
            </div>
          ) : (
            <div style={{display:"grid",gap:8}}>
              {empresas.map(e=> {
                const isSel = e.cnpj.replace(/\D/g,"") === cnpj.replace(/\D/g,"");
                const isLast = e.cnpj.replace(/\D/g,"") === lastCnpj;
                const v = valid[e.cnpj];
                const busy = loadingCnpj === e.cnpj.replace(/\D/g,"");
                return (
                  <button key={e.cnpj} onClick={()=> entrar(e.cnpj)} disabled={loading} style={{textAlign:"left",padding:12,border: isSel?"2px solid #0f172a":"1px solid #e2e8f0",borderRadius:12,background: isSel?"#f8fafc":"#fff",opacity:loading&&!busy?0.6:1}}>
                    <div style={{fontWeight:800,fontSize:13}}>{e.razaoSocial||e.apelido||e.cnpj} {isLast && <span style={{background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:999,padding:"1px 7px",fontSize:10}}>★ última usada</span>} {isSel && <span style={{fontSize:11,color:"#64748b"}}>• selecionada</span>}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{e.cnpj} {e.portalUser?`• ${e.portalUser}`:"• sem e-mail Portal"} {v ? (v.valid?"• sessão válida":"• sessão expirada") : ""}</div>
                    <div style={{fontSize:11,marginTop:4,color:busy?"#2563eb":"#16a34a",fontWeight:700}}>{busy ? "Conectando no Portal..." : `Entrar e conectar no Portal →`}</div>
                  </button>
                );
              })}
            </div>
          )}
          <button onClick={()=> entrar()} disabled={loading || !empresas.length} style={{padding:12,background:loading?"#94a3b8":"#0f172a",color:"#fff",border:"none",borderRadius:10,fontWeight:800,opacity:loading?0.7:1}}>{loading?`Conectando ${selEmpresa?.razaoSocial||selEmpresa?.apelido||""} no Portal...`:"Entrar com empresa selecionada"}</button>
          {msg && <div style={{background:msg.startsWith("✅")?"#f0fdf4":msg.startsWith("❌")?"#fef2f2":msg.startsWith("⚠️")?"#fffbeb":"#f8fafc",border:`1px solid ${msg.startsWith("✅")?"#bbf7d0":msg.startsWith("❌")?"#fecaca":msg.startsWith("⚠️")?"#fde68a":"#e2e8f0"}`,padding:10,borderRadius:10,fontSize:12,whiteSpace:"pre-wrap"}}>{msg}</div>}
        </div>
      </div>
      <div style={{textAlign:"center",fontSize:12,marginTop:10}}><a href="/empresas" style={{color:"#2563eb"}}>Gerenciar empresas</a> <span style={{color:"#cbd5e1"}}>•</span> <a href="/" style={{color:"#64748b"}}>Início</a></div>
    </main>
  );
}
