"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
type Empresa = { cnpj: string; apelido?: string; razaoSocial?: string; portalUser?: string; portalPass?: string; createdAt: string };
function fmtCNPJ(s:string){ const d=s.replace(/\D/g,"").padEnd(14,"_"); return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5"); }
export default function EmpresasPage(){
  const [lista, setLista] = useState<Empresa[]>([]);
  const [valid, setValid] = useState<Record<string,{valid:boolean,hasCookie:boolean}>>({});
  const [form, setForm] = useState({cnpj:"", razaoSocial:"", apelido:"", portalUser:"", portalPass:""});
  const [msg,setMsg]=useState(""); const [loading,setLoading]=useState(false);
  async function load(){
    const r=await fetch(`${API}/api/cnpjs`).then(r=>r.json()).catch(()=>[]);
    setLista(Array.isArray(r)?r:[]);
    for(const e of (Array.isArray(r)?r:[])){ fetch(`${API}/api/cnpjs/${e.cnpj}/valid`).then(x=>x.json()).then(j=> setValid(v=>({...v,[e.cnpj]:j}))).catch(()=>{}); }
  }
  useEffect(()=>{ load(); },[]);
  async function salvar(){
    const cnpj=form.cnpj.replace(/\D/g,"");
    if(cnpj.length!==14) return setMsg("CNPJ precisa ter 14 dígitos");
    if(!form.razaoSocial && !form.apelido) return setMsg("Informe nome da empresa (Razão social ou Apelido)");
    setLoading(true); setMsg("");
    const r=await fetch(`${API}/api/cnpjs`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cnpj, razaoSocial:form.razaoSocial||undefined, apelido:form.apelido||undefined, portalUser:form.portalUser||undefined, portalPass:form.portalPass||undefined})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) setMsg("Erro: "+JSON.stringify(j)); else { setMsg(`✅ Empresa ${j.razaoSocial||j.apelido||j.cnpj} salva`); setForm({cnpj:"",razaoSocial:"",apelido:"",portalUser:"",portalPass:""}); load(); }
    setLoading(false);
  }
  async function login(cnpj:string){
    const e=lista.find(x=>x.cnpj===cnpj);
    if(!e?.portalUser || !e?.portalPass){ setMsg("Defina e-mail e senha do Portal para "+cnpj); return; }
    setMsg("Conectando "+cnpj+"...");
    const r=await fetch(`${API}/api/cnpjs/${cnpj}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({portalUser:e.portalUser, portalPass:e.portalPass})});
    const j=await r.json().catch(()=>({}));
    setMsg(j.ok ? `✅ Login OK ${cnpj}` : `❌ Login falhou ${cnpj}: ${JSON.stringify(j)}`);
    load();
  }
  async function remover(cnpj:string){ if(!confirm(`Remover empresa ${cnpj}? Também apaga sessão.`)) return; await fetch(`${API}/api/cnpjs/${cnpj}`,{method:"DELETE"}); setMsg("Removida "+cnpj); load(); }
  return (
    <main style={{maxWidth:1200,margin:"0 auto",padding:24}}>
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:16}}>
        <h1 style={{margin:0,fontSize:20}}>Empresas — múltiplos CNPJs</h1>
        <p style={{color:"#64748b",fontSize:13,margin:"8px 0 0"}}>Cadastre cada empresa com <b>nome</b> e <b>login do Portal</b> separado. O bot usa a sessão do CNPJ escolhido na hora de disputar. O Postgres local guarda tudo; sessão fica em <code>storage/&lt;CNPJ&gt;.json</code>.</p>
      </div>
      <div style={{marginTop:12,background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:16}}>
        <b style={{fontSize:13}}>Nova / editar empresa</b>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
          <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,fontWeight:700}}>CNPJ (14 dígitos) <input value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})} placeholder="00000000000000" style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10}} /></label>
          <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,fontWeight:700}}>Razão social / Nome da empresa * <input value={form.razaoSocial} onChange={e=>setForm({...form,razaoSocial:e.target.value})} placeholder="Ex: Fenix Alimentos LTDA" style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10}} /></label>
          <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,fontWeight:700}}>Apelido (curto) <input value={form.apelido} onChange={e=>setForm({...form,apelido:e.target.value})} placeholder="Ex: Fenix" style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10}} /></label>
          <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,fontWeight:700}}>E-mail Portal (login Keycloak) <input value={form.portalUser} onChange={e=>setForm({...form,portalUser:e.target.value})} placeholder="ex: empresa@..." style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10}} /></label>
          <label style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,fontWeight:700}}>Senha Portal <input type="password" value={form.portalPass} onChange={e=>setForm({...form,portalPass:e.target.value})} placeholder="••••••••" style={{padding:10,border:"1px solid #e2e8f0",borderRadius:10}} /></label>
          <div style={{display:"flex",alignItems:"end"}}><button onClick={salvar} disabled={loading} style={{width:"100%",padding:12,background:"#0f172a",color:"#fff",border:"none",borderRadius:10,fontWeight:800,opacity:loading?0.6:1}}>{loading?"Salvando...":"💾 Salvar empresa"}</button></div>
        </div>
        {msg && <pre style={{marginTop:10,background:msg.startsWith("✅")?"#f0fdf4":msg.startsWith("❌")?"#fef2f2":"#f8fafc",border:`1px solid ${msg.startsWith("✅")?"#bbf7d0":msg.startsWith("❌")?"#fecaca":"#e2e8f0"}`,padding:10,borderRadius:10,fontSize:12,whiteSpace:"pre-wrap"}}>{msg}</pre>}
      </div>
      <div style={{marginTop:12,display:"grid",gap:10}}>
        {lista.length ? lista.map(e=>{
          const v=valid[e.cnpj];
          const nome=e.razaoSocial || e.apelido || e.cnpj;
          return (
            <div key={e.cnpj} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:14,display:"grid",gridTemplateColumns:"1fr auto",gap:12}}>
              <div>
                <div style={{fontWeight:800,fontSize:14}}>{nome} <span style={{fontWeight:400,color:"#64748b",fontSize:12}}>• {fmtCNPJ(e.cnpj)}</span> {e.apelido && e.razaoSocial && <span style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:999,padding:"2px 8px",fontSize:11,marginLeft:6}}>{e.apelido}</span>}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Login Portal: {e.portalUser || <span style={{color:"#b91c1c"}}>não configurado</span>} • cadastrada {new Date(e.createdAt).toLocaleString("pt-BR")}</div>
                <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap",fontSize:11}}>
                  <span style={{background: v?.valid ? "#dcfce7" : v ? "#fee2e2" : "#f1f5f9", border:"1px solid #e2e8f0", padding:"3px 8px", borderRadius:999}}>{v ? (v.valid ? "● sessão válida" : "○ expirada/sem cookie") : "… verificando"}</span>
                  {v?.hasCookie && <span style={{background:"#eff6ff",padding:"3px 8px",borderRadius:999,border:"1px solid #bfdbfe"}}>cookie ok</span>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:160}}>
                <button onClick={()=>login(e.cnpj)} style={{padding:"8px 12px",background:"#16a34a",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:12}}>🔑 Conectar</button>
                <button onClick={()=>{setForm({cnpj:e.cnpj, razaoSocial:e.razaoSocial||"", apelido:e.apelido||"", portalUser:e.portalUser||"", portalPass:e.portalPass||""}); window.scrollTo({top:0,behavior:"smooth"})}} style={{padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:8,background:"#fff",fontWeight:700,fontSize:12}}>✏️ Editar</button>
                <button onClick={()=>remover(e.cnpj)} style={{padding:"8px 12px",border:"1px solid #fecaca",borderRadius:8,background:"#fef2f2",color:"#b91c1c",fontWeight:700,fontSize:12}}>🗑️ Remover</button>
              </div>
            </div>
          );
        }) : <div style={{background:"#fff",border:"1px dashed #cbd5e1",borderRadius:14,padding:24,textAlign:"center",color:"#64748b"}}>Nenhuma empresa cadastrada — adicione a primeira acima. Depois ela aparece em <b>Configurar bot</b> e <b>Ao vivo</b> como “Razão social — CNPJ”.</div>}
      </div>
    </main>
  );
}
