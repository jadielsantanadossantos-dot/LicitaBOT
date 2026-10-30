"use client";
import { useEffect, useRef, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export default function SessaoPage() {
  const [id, setId] = useState("504989");
  const [cnpj, setCnpj] = useState("");
  const [cnpjs, setCnpjs] = useState<{cnpj:string,apelido?:string,razaoSocial?:string}[]>([]);
  const [live, setLive] = useState<any>(null);
  const [hora, setHora] = useState("");
  const [valor, setValor] = useState<Record<string,string>>({});
  const [msg, setMsg] = useState("");
  const [watching, setWatching] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [minhas, setMinhas] = useState<any[]>([]);
  const [portais, setPortais] = useState<any[]>([]);
  const [buscaPortal, setBuscaPortal] = useState("");
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [autoCfg, setAutoCfg] = useState<Record<string,number>>({});
  const [botOn, setBotOn] = useState<Record<string,boolean>>({});
  const chatRef = useRef<HTMLDivElement>(null);
  const prevChatLen = useRef(0);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [alvoGeral, setAlvoGeral] = useState(1);
  const [decrementoGeral, setDecrementoGeral] = useState("0.10");
  const [estrategiaGeral, setEstrategiaGeral] = useState("cobrir_minimo");
  const PAGE_SIZE = 10;
  async function loadCNPJ(){
    const r=await fetch(`${API}/api/cnpjs`).then(r=>r.json()).catch(()=>[]);
    if(Array.isArray(r) && r.length){
      setCnpjs(r);
      // ?cnpj= já definido pelo useEffect inicial — não sobrescreve
      if(cnpj) return;
      // Empresa logada tem prioridade — nunca cai na empresa errada
      const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");
      let logada = "";
      try {
        const s = JSON.parse(sessionStorage.getItem("licitabot.login") || "null");
        if (s?.cnpj) logada = onlyDigits(s.cnpj);
      } catch {}
      if (!logada) {
        try { logada = onlyDigits(localStorage.getItem("licitabot.lastCnpj") || localStorage.getItem("licitabot.cnpj") || ""); } catch {}
      }
      const alvo = (r as any[]).find((x) => onlyDigits(x.cnpj) === logada) ?? (r as any[])[0];
      if (alvo) setCnpj(alvo.cnpj);
    }
    else setCnpj("");
  }
  async function loadMinhas(){
    const [d,a] = await Promise.all([
      fetch(`${API}/api/disputas`).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/api/agenda`).then(r=>r.json()).catch(()=>[]),
    ]);
    const arr = Array.isArray(d) ? d : [];
    const ag = Array.isArray(a) ? a : [];
    const map = new Map<string, any>();
    for(const x of [...arr, ...ag]) if(!map.has(x.id)) map.set(x.id, x);
    const list = [...map.values()].filter(x=> x.processoId).sort((x,y)=> new Date(x.dataHora).getTime() - new Date(y.dataHora).getTime());
    setMinhas(list);
    for(const disp of arr){
      try{
        const r=await fetch(`${API}/api/disputas/${disp.id}/auto`).then(r=>r.json()).catch(()=>null);
        if(r) setBotOn(s=> ({...s, [disp.id]: !!r.auto}));
      }catch{}
      for(const it of disp.itens||[]){
        setAutoCfg(s=> ({...s, [`${disp.id}:${it.loteId}`]: Number(it.posicaoAlvo)||1}));
      }
    }
  }
  useEffect(()=>{
    const sp=new URLSearchParams(window.location.search);
    const qid=sp.get("id"); if(qid) setId(qid);
    const qcnpj=sp.get("cnpj"); if(qcnpj) setCnpj(qcnpj.replace(/\D/g,""));
    loadCNPJ(); loadMinhas();
  },[]);
  useEffect(()=>{ if(cnpj){ loadMinhas(); loadPortais(); } },[cnpj]);
  async function loadPortais(q?: string){
    if(!cnpj) return;
    setLoadingPortal(true);
    try{
      const p = new URLSearchParams({ cnpj, situacao: "Aberto" });
      if(q) p.set("q", q);
      const r = await fetch(`${API}/api/pregoes/participando?${p.toString()}`).then(r=>r.json()).catch(()=>null);
      const arr = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      setPortais(arr.slice(0, 100));
      if(!arr.length) setMsg("Nenhum pregão em aberto que você participa — verifique a sessão da empresa em /empresas → Conectar");
    }catch{}
    setLoadingPortal(false);
  }
  async function watch(targetId?: string, targetCnpj?: string){
    const useId = targetId || id;
    const useCnpj = (targetCnpj || cnpj).replace(/\D/g,"");
    if(!useId) return setMsg("Informe o ID da licitação (ex: 504989)");
    if(!useCnpj) return setMsg("Selecione a empresa");
    if(targetId) setId(targetId);
    if(targetCnpj) setCnpj(targetCnpj);
    setMsg("Conectando na sessão...");
    setLive(null);
    const r=await fetch(`${API}/api/live/${useId}/watch`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cnpj: useCnpj})});
    const j=await r.json().catch(()=>({}));
    if(r.ok){ setWatching(true); setPagina(1); prevChatLen.current=0; setMsg("✅ Ao vivo " + useId + " — chat e lances atualizam a cada 3,5s"); } else setMsg("Erro: " + JSON.stringify(j));
  }
  function watchPregao(m: any){
    watch(m.processoId, m.cnpj);
  }
  async function unwatch(){ await fetch(`${API}/api/live/${id}/unwatch`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cnpj})}); setWatching(false); setMsg("⏸️ Pausado (só esta empresa — a outra continua)"); }
  useEffect(()=>{
    if(!id || !cnpj) return;
    const t=setInterval(async()=>{
      try{
        const h=await fetch(`${API}/api/hora?cnpj=${cnpj}`).then(r=>r.json()).catch(()=>null);
        if(h?.hora) setHora(new Date(h.hora).toLocaleString("pt-BR"));
        if(!watching) return;
        const l=await fetch(`${API}/api/live/${id}?cnpj=${cnpj}`).then(r=> r.ok?r.json():null).catch(()=>null);
        if(l) setLive(l);
      }catch{}
    },3500);
    return()=>clearInterval(t);
  },[id,cnpj,watching]);
  useEffect(()=>{
    if(!live?.chat?.length) return;
    if(live.chat.length !== prevChatLen.current){
      prevChatLen.current = live.chat.length;
      if(chatRef.current) chatRef.current.scrollTop = 0;
    }
  },[live?.chat]);
  async function enviar(itemId:string){
    const v=Number((valor[itemId]||"").replace(",","."));
    if(!v) return setMsg("Digite um valor válido (ex: 99,50)");
    const r=await fetch(`${API}/api/lance`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({licitacaoId:id,itemId,valor:v,cnpj})});
    const j=await r.json().catch(()=>({}));
    setMsg((r.ok?"✅ Lance enviado: ":"❌ Erro: ") + (j.mensagem || j.raw || j.error || "").slice(0,400));
  }
  async function setPosicao(disputaId:string, loteId:string, pos:number){
    setAutoCfg(s=> ({...s, [`${disputaId}:${loteId}`]: pos}));
    const r=await fetch(`${API}/api/disputas/${disputaId}/itens/${loteId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({posicaoAlvo:pos})});
    const j=await r.json().catch(()=>null);
    if(r.ok) setMsg(`✅ Alvo lote ${loteId} → ${pos}º`); else setMsg("❌ "+JSON.stringify(j));
    loadMinhas();
  }
  async function toggleBot(disputaId:string){
    const next=!botOn[disputaId];
    const r=await fetch(`${API}/api/disputas/${disputaId}/auto`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({on:next})});
    const j=await r.json().catch(()=>null);
    if(r.ok){ setBotOn(s=>({...s,[disputaId]:next})); setMsg(next?`✅ Bot ligado ${disputaId.slice(0,8)}`:`⏸️ Bot pausado ${disputaId.slice(0,8)}`);} else setMsg("❌ "+JSON.stringify(j));
  }
  async function toggleItemBot(disputaId:string, loteId:string, nextAtivo:boolean){
    const r=await fetch(`${API}/api/disputas/${disputaId}/itens/${loteId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ativo:nextAtivo})});
    const j=await r.json().catch(()=>null);
    if(r.ok) setMsg(nextAtivo?`▶️ Bot retomado lote ${loteId}`:`⏸️ Bot parado lote ${loteId} — não lança mais`);
    else setMsg("❌ "+JSON.stringify(j));
    loadMinhas();
  }
  async function setPosicaoTodos(disputaId:string, pos:number){
    if(!disputaId || !(pos>=1 && pos<=10)) return;
    if(!confirm(`Mudar alvo para ${pos}º em TODOS os itens desta disputa?`)) return;
    await aplicarCampoTodos(disputaId, { posicaoAlvo: pos }, `Alvo ${pos}º`);
  }
  async function aplicarCampoTodos(disputaId:string, body:Record<string,any>, rotulo:string){
    if(!disputaId) return;
    setMsg(`Aplicando ${rotulo} em todos...`);
    const itens = disputaAtiva?.itens ?? [];
    let ok = 0, fail = 0;
    for(const it of itens){
      try{
        const r=await fetch(`${API}/api/disputas/${disputaId}/itens/${String((it as any).loteId)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        if(r.ok) ok++; else fail++;
      }catch{ fail++; }
    }
    setMsg(`✅ ${rotulo} aplicado em ${ok} item(ns)${fail?` • ${fail} falharam`:``}`);
    loadMinhas();
  }
  async function setDecrementoTodos(disputaId:string, raw:string){
    const v = Number(String(raw).replace(",",".").trim());
    if(!v || v<=0) { setMsg("❌ Decremento inválido — ex: 0,10"); return; }
    if(!confirm(`Mudar decremento para R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2})} em TODOS os itens?`)) return;
    await aplicarCampoTodos(disputaId, { decremento: v }, `Decremento R$ ${v}`);
  }
  async function setEstrategiaTodos(disputaId:string, est:string){
    if(!est) return;
    if(!confirm(`Mudar estratégia para "${est}" em TODOS os itens?`)) return;
    await aplicarCampoTodos(disputaId, { estrategia: est }, `Estratégia ${est}`);
  }
  async function panicGeral(){
    if(!confirm("Parar TODOS os bots agora (panic)? Limpa filas e desliga o automático.")) return;
    const r=await fetch(`${API}/api/disputas/panic`,{method:"POST"});
    const j=await r.json().catch(()=>null);
    if(r.ok){ setBotOn({}); setMsg("⛔ Panic geral: todos os bots desligados"); } else setMsg("❌ "+JSON.stringify(j));
    loadMinhas();
  }
  const [aba, setAba] = useState<"todos"|"seus"|"abertos"|"fechados"|"suspensos"|"desempate"|"encerrados"|"outros">("abertos");
  const disputaAtiva = minhas.find((m:any)=> m.processoId===id && String(m.cnpj||"").replace(/\D/g,"")===cnpj.replace(/\D/g,"")) ?? null;
  const todosItens = live?.itens ?? [];
  const sit = (it:any)=> String(it.situacao||"").toLowerCase();
  const filtrarAba = (lista:any[], qual:string)=>{
    switch(qual){
      case "seus": return lista.filter((it:any)=> it.posicao!=null || it.estaVencendo!=null);
      case "abertos": return lista.filter((it:any)=> it.temFormLance);
      case "fechados": return lista.filter((it:any)=> sit(it).includes("fechado") && !it.temFormLance);
      case "suspensos": return lista.filter((it:any)=> sit(it).includes("suspens"));
      case "desempate": return lista.filter((it:any)=> sit(it).includes("desempate") || sit(it).includes("empate"));
      case "encerrados": return lista.filter((it:any)=> sit(it).includes("encerrad") || sit(it).includes("arrematante"));
      case "outros": return lista.filter((it:any)=> sit(it).includes("cancel") || sit(it).includes("desert") || sit(it).includes("fracass") || sit(it).includes("outro"));
      default: return lista;
    }
  };
  const contagem:any = {
    todos: todosItens.length,
    seus: filtrarAba(todosItens,"seus").length,
    abertos: filtrarAba(todosItens,"abertos").length,
    fechados: filtrarAba(todosItens,"fechados").length,
    suspensos: filtrarAba(todosItens,"suspensos").length,
    desempate: filtrarAba(todosItens,"desempate").length,
    encerrados: filtrarAba(todosItens,"encerrados").length,
    outros: filtrarAba(todosItens,"outros").length,
  };
  const itensAbertos = filtrarAba(todosItens,"abertos");
  const itensVisiveis = filtrarAba(todosItens, aba);
  const totalItens = itensVisiveis.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / PAGE_SIZE));
  const paginaSafe = Math.min(pagina, totalPaginas);
  const itensPagina = itensVisiveis.slice((paginaSafe-1)*PAGE_SIZE, paginaSafe*PAGE_SIZE);
  const ABAS = [["todos","Todos"],["seus","Seus"],["abertos","Abertos"],["fechados","Fechados"],["suspensos","Suspensos"],["desempate","Desempate"],["encerrados","Encerrados"],["outros","Outros"]] as const;
  const empresaNome = cnpjs.find(x=>x.cnpj===cnpj)?.razaoSocial || cnpjs.find(x=>x.cnpj===cnpj)?.apelido || cnpj;
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:16 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}><span style={{ background:"#f59e0b", color:"#fff", borderRadius:999, padding:"4px 10px", fontSize:11, fontWeight:800 }}>PASSO 3</span><h1 style={{ margin:0, fontSize:20 }}>Sessão ao vivo</h1><span style={{ color:"#64748b", fontSize:12, marginLeft:8 }}>Espelha o Portal — lances + chat a cada 3,5s</span></div>
        {minhas.length ? (
          <details style={{ marginTop:12, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 12px" }}>
            <summary style={{ cursor:"pointer", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", listStyle:"none" }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#334155" }}>🤖 Meus pregões ({minhas.filter((m:any)=> mostrarTodas || String(m.cnpj||"").replace(/\D/g,"")===cnpj.replace(/\D/g,"")).length})</span>
              <span style={{ fontSize:11, color:"#64748b" }}>Selecionado: <b>{id}</b>{empresaNome ? ` • ${(empresaNome||"").slice(0,28)}` : ""}</span>
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:800, color:"#2563eb", border:"1px solid #e2e8f0", background:"#fff", borderRadius:999, padding:"6px 12px" }}>Ver / trocar ▾</span>
            </summary>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:10 }}>
              <div style={{ fontSize:11, color:"#64748b" }}>Clique para acompanhar — já troca ID + empresa</div>
              <label style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center", fontSize:11, fontWeight:700, color:"#475569" }}>
                <input type="checkbox" checked={mostrarTodas} onChange={(e)=> setMostrarTodas(e.target.checked)} /> todas as empresas
              </label>
            </div>
            {(() => {
              const visiveis = minhas.filter((m:any)=> mostrarTodas || String(m.cnpj||"").replace(/\D/g,"")===cnpj.replace(/\D/g,""));
              if(!visiveis.length) return <div style={{ fontSize:12, color:"#64748b", marginTop:8 }}>Nenhum pregão desta empresa — troque a empresa acima ou marque “mostrar todas”.</div>;
              const porEmpresa = new Map<string, any[]>();
              for (const m of visiveis) {
                const k = String((m as any).cnpj || "").replace(/\D/g, "") || "sem-cnpj";
                if (!porEmpresa.has(k)) porEmpresa.set(k, []);
                porEmpresa.get(k)!.push(m);
              }
              return [...porEmpresa.entries()].map(([ecnpj, lista]) => {
                const n = cnpjs.find((x) => String(x.cnpj).replace(/\D/g, "") === ecnpj);
                const nomeEmp = n?.razaoSocial || n?.apelido || ecnpj;
                return (
                <div key={ecnpj} style={{ marginTop:8, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:8 }}>
                  <div style={{ fontSize:12, fontWeight:800 }}>🏢 {nomeEmp} <span style={{ fontWeight:400, color:"#64748b" }}>• {ecnpj} • {lista.length} pregão(ões)</span></div>
                  <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap", overflowX:"auto", maxHeight:220, overflowY:"auto" }}>
                  {lista.map((m:any)=>{
                    const isSel = m.processoId === id && String(m.cnpj||"").replace(/\D/g,"")===cnpj.replace(/\D/g,"");
                    return (
                      <button key={m.id} onClick={()=>watchPregao(m)} style={{ textAlign:"left", padding:"8px 10px", border: isSel?"2px solid #0f172a":"1px solid #e2e8f0", borderRadius:10, background: isSel?"#0f172a":"#fff", color: isSel?"#fff":"#111", minWidth:180 }}>
                        <div style={{ fontWeight:800, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.processoId} {m.status==="em_andamento"?"●":"•"} {m.status}</div>
                        <div style={{ fontSize:11, opacity:0.8, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.dataHora ? new Date(m.dataHora).toLocaleString("pt-BR") : ""}</div>
                      </button>
                    );
                  })}
                  </div>
                </div>
                );
              });
            })()}
          </details>
        ) : (
          <div style={{ marginTop:12, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:12, fontSize:12 }}>Nenhuma disputa configurada no bot — <a href="/disputas" style={{color:"#92400e",fontWeight:700}}>configure o bot</a> ou escolha um pregão do Portal abaixo.</div>
        )}
        <details style={{ marginTop:12, background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 12px" }}>
          <summary style={{ cursor:"pointer", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", listStyle:"none" }}>
            <span style={{ fontSize:12, fontWeight:800, color:"#334155" }}>🌐 Pregões do Portal {loadingPortal ? "…" : portais.length ? `(${portais.length})` : ""}</span>
            <span style={{ fontSize:11, color:"#64748b" }}>Só os que você participa</span>
            <span style={{ marginLeft:"auto", fontSize:11, fontWeight:800, color:"#2563eb", border:"1px solid #e2e8f0", background:"#f8fafc", borderRadius:999, padding:"6px 12px" }}>Buscar / ver ▾</span>
          </summary>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:10 }}>
            <div style={{ display:"flex", gap:6, width:"100%" }}>
              <input value={buscaPortal} onChange={e=> setBuscaPortal(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") loadPortais(buscaPortal); }} placeholder="Buscar nº, objeto, órgão..." style={{ flex:1, minWidth:0, padding:"10px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:12, minHeight:40 }} />
              <button onClick={()=> loadPortais(buscaPortal)} disabled={loadingPortal} style={{ padding:"10px 14px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12, minHeight:40 }}>🔍</button>
            </div>
          </div>
          {portais.length ? (
            <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap", overflowX:"auto", maxHeight:240, overflowY:"auto" }}>
              {portais.map((p:any)=>{
                const isSel = String(p.id) === String(id);
                const cfg = minhas.find((m:any)=> String(m.processoId)===String(p.id));
                return (
                  <button key={p.id} onClick={()=>{ setId(String(p.id)); watch(String(p.id), cnpj); }} style={{ textAlign:"left", padding:"8px 10px", border: isSel?"2px solid #2563eb":"1px solid #e2e8f0", borderRadius:10, background: isSel?"#eff6ff":"#fff", color:"#111", minWidth:220, maxWidth:320 }}>
                    <div style={{ fontWeight:800, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.numero || p.id} {cfg ? <span style={{background:"#dcfce7",borderRadius:999,padding:"1px 6px",fontSize:10}}>🤖 bot</span> : null}</div>
                    <div style={{ fontSize:11, color:"#475569", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.orgao || ""}</div>
                    <div style={{ fontSize:11, color:"#64748b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{(p.objeto||"").slice(0,60)}</div>
                    <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>ID {p.id}{p.dataAbertura ? ` • ${new Date(p.dataAbertura).toLocaleString("pt-BR")}` : ""}{p.situacao ? ` • ${p.situacao}` : ""}</div>
                  </button>
                );
              })}
            </div>
          ) : <div style={{ fontSize:12, color:"#64748b", marginTop:8 }}>{loadingPortal ? "Buscando no Portal..." : "Nenhum pregão carregado — clique em Buscar."}</div>}
        </details>
        <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1.2fr 1fr auto", gap:10, alignItems:"end" }}>
          <label style={{ display:"flex", flexDirection:"column", gap:4, fontSize:11, fontWeight:700, color:"#334155" }}>ID da licitação <input value={id} onChange={e=>{ const v=e.target.value; setId(v); const hit=minhas.find((m:any)=> String(m.processoId)===String(v)); if(hit && String(hit.cnpj||"").replace(/\D/g,"")!==cnpj.replace(/\D/g,"")) setCnpj(hit.cnpj); }} placeholder="Ex: 504989 (Sapé/PB)" style={{ padding:10, border:"2px solid #e2e8f0", borderRadius:10, fontWeight:700 }} /><span style={{ fontWeight:400, color:"#64748b" }}>Ou clique em um pregão acima • Teste <a href="#" onClick={e=>{e.preventDefault(); watch("504989")}} style={{ color:"#2563eb" }}>504989</a></span></label>
           <label style={{ display:"flex", flexDirection:"column", gap:4, fontSize:11, fontWeight:700, color:"#334155" }}>Empresa que vai dar lance <select value={cnpj} onChange={e=>setCnpj(e.target.value)} style={{ padding:10, border:"1px solid #e2e8f0", borderRadius:10 }}>{cnpjs.length? cnpjs.map(c=> <option key={c.cnpj} value={c.cnpj}>{c.razaoSocial || c.apelido || c.cnpj} — {c.cnpj}</option>) : <option value={cnpj}>{cnpj || "nenhuma empresa — cadastre em Empresas"}</option>}</select><span style={{ fontWeight:400, color:"#64748b" }}><a href="/empresas" style={{color:"#2563eb"}}>Gerenciar empresas</a></span></label>
          <div style={{ display:"flex", gap:8, paddingBottom:18 }}>
            {!watching ? <button onClick={()=>watch()} style={{ padding:"12px 18px", background:"#0f172a", color:"#fff", borderRadius:10, border:"none", fontWeight:800 }}>▶️ Acompanhar</button> : <button onClick={unwatch} style={{ padding:"12px 18px", border:"1px solid #e2e8f0", borderRadius:10, background:"#fff", fontWeight:700 }}>⏸️ Pausar</button>}
          </div>
        </div>
        {disputaAtiva && (() => {
          const itens = disputaAtiva.itens ?? [];
          const ativos = itens.filter((x: any) => x.ativo !== false).length;
          const ligado = !!botOn[disputaAtiva.id];
          return (
          <div style={{ marginTop:10, background: ligado?"#f0fdf4":"#fff", border:`1px solid ${ligado?"#bbf7d0":"#e2e8f0"}`, borderRadius:14, padding:12, display:"grid", gap:10 }}>
            <style>{`@media (max-width:640px){.bot-linha{flex-direction:column !important;align-items:stretch !important;}.bot-btn{width:100% !important;min-height:44px !important;}.bot-geral{flex-direction:column !important;align-items:stretch !important;}.bot-geral>div{min-width:0 !important;}}`}</style>
            <div className="bot-linha" style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:8, background: ligado?"#16a34a":"#f1f5f9", color: ligado?"#fff":"#475569", padding:"6px 12px", borderRadius:999, fontSize:12, fontWeight:800 }}>
                <span style={{ width:8, height:8, borderRadius:999, background: ligado?"#fff":"#f59e0b", display:"inline-block" }} />
                {ligado ? "BOT LIGADO" : "BOT PAUSADO"}
              </span>
              <span style={{ fontSize:12, color:"#64748b" }}>{itens.length} {itens.length===1?"item":"itens"}{ativos!==itens.length ? ` • ${ativos} ativos` : ""}</span>
              <div className="bot-linha" style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
                <button className="bot-btn" onClick={()=>toggleBot(disputaAtiva.id)} style={{ padding:"10px 16px", background: ligado?"#fff":"#16a34a", color: ligado?"#b91c1c":"#fff", border: ligado?"1px solid #fecaca":"none", borderRadius:10, fontWeight:800, fontSize:13, minHeight:40, cursor:"pointer" }}>{ligado?"⏸️ Pausar":"▶️ Ligar bot"}</button>
                <button className="bot-btn" onClick={panicGeral} title="Desliga todos os bots" style={{ padding:"10px 16px", background:"#fff", color:"#7f1d1d", border:"1px solid #fecaca", borderRadius:10, fontWeight:700, fontSize:13, minHeight:40, cursor:"pointer" }}>⛔ Parar tudo</button>
              </div>
            </div>
            <div className="bot-geral" style={{ display:"flex", gap:8, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 10px", flexWrap:"wrap" }}>
              <div style={{ flex:"1 1 0", minWidth:200, display:"flex", gap:8, alignItems:"end", background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:8 }}>
                <label style={{ flex:1, minWidth:0, fontSize:11, fontWeight:700, color:"#334155", display:"flex", flexDirection:"column", gap:6 }}>🎯 Alvo geral
                  <select value={alvoGeral} onChange={e=> setAlvoGeral(Number(e.target.value))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, background:"#fff", fontWeight:800, fontSize:13, minHeight:40 }}>{Array.from({length:10},(_,i)=> <option key={i+1} value={i+1}>{i+1}º lugar</option>)}</select>
                </label>
                <button className="bot-btn" onClick={()=> setPosicaoTodos(disputaAtiva.id, Number(alvoGeral))} style={{ padding:"10px 12px", background:"#0f172a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12, minHeight:40, cursor:"pointer", whiteSpace:"nowrap" }}>Aplicar</button>
              </div>
              <div style={{ flex:"1 1 0", minWidth:200, display:"flex", gap:8, alignItems:"end", background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:8 }}>
                <label style={{ flex:1, minWidth:0, fontSize:11, fontWeight:700, color:"#334155", display:"flex", flexDirection:"column", gap:6 }}>➖ Decremento geral
                  <input value={decrementoGeral} onChange={e=> setDecrementoGeral(e.target.value)} placeholder="0,10" inputMode="decimal" style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, background:"#fff", fontWeight:800, fontSize:13, minHeight:40 }} />
                </label>
                <button className="bot-btn" onClick={()=> setDecrementoTodos(disputaAtiva.id, decrementoGeral)} style={{ padding:"10px 12px", background:"#0f172a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12, minHeight:40, cursor:"pointer", whiteSpace:"nowrap" }}>Aplicar</button>
              </div>
              <div style={{ flex:"1 1 0", minWidth:200, display:"flex", gap:8, alignItems:"end", background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:8 }}>
                <label style={{ flex:1, minWidth:0, fontSize:11, fontWeight:700, color:"#334155", display:"flex", flexDirection:"column", gap:6 }}>🧠 Estratégia geral
                  <select value={estrategiaGeral} onChange={e=> setEstrategiaGeral(e.target.value)} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, background:"#fff", fontWeight:800, fontSize:13, minHeight:40 }}>
                    <option value="cobrir_minimo">cobrir mínimo</option>
                    <option value="agressivo">agressivo</option>
                    <option value="conservador">conservador</option>
                    <option value="sniper">sniper</option>
                  </select>
                </label>
                <button className="bot-btn" onClick={()=> setEstrategiaTodos(disputaAtiva.id, estrategiaGeral)} style={{ padding:"10px 12px", background:"#0f172a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12, minHeight:40, cursor:"pointer", whiteSpace:"nowrap" }}>Aplicar</button>
              </div>
            </div>
          </div>
          );
        })()}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10, fontSize:12, color:"#475569" }}>
          <span style={{ background: watching?"#dcfce7":"#f1f5f9", border:"1px solid #e2e8f0", padding:"6px 10px", borderRadius:999 }}>{watching?"● ao vivo":"○ parado"} {live?.updatedAt ? `• ${new Date(live.updatedAt).toLocaleTimeString("pt-BR")}` : ""}</span>
          <span style={{ background:"#f8fafc", border:"1px solid #e2e8f0", padding:"6px 10px", borderRadius:999 }}>Hora servidor: {hora || "--"}</span>
          {live && <><span style={{ background:"#eff6ff", padding:"6px 10px", borderRadius:999 }}><b>Status:</b> {live.status || "—"}</span><span style={{ background:"#f0fdf4", padding:"6px 10px", borderRadius:999 }}><b>Abertos:</b> {itensAbertos.length}/{todosItens.length} {totalPaginas>1? `• pág ${paginaSafe}/${totalPaginas}`:""}</span><span style={{ background:"#fff7ed", padding:"6px 10px", borderRadius:999 }}><b>Chat:</b> {live.chat?.length ?? 0} {watching?"• ao vivo":""}</span></>}
        </div>
        {msg && <div style={{ marginTop:10, background: msg.startsWith("✅")?"#f0fdf4": msg.startsWith("❌")?"#fef2f2":"#0f172a", color: msg.startsWith("✅")||msg.startsWith("❌")?"#111":"#e2e8f0", border: `1px solid ${msg.startsWith("✅")?"#bbf7d0":msg.startsWith("❌")?"#fecaca":"#1e293b"}`, padding:10, borderRadius:10, fontSize:12, whiteSpace:"pre-wrap" }}>{msg}</div>}
        {live?.error && <div style={{ background:"#fee2e2", border:"1px solid #fecaca", padding:10, borderRadius:10, marginTop:10, fontSize:12 }}>{live.error === "waf_challenge" ? <>🛡️ Portal exibiu verificação “você é humano” (bloqueio anti-robô) — <b>o relogin automático não consegue passar</b>. Resolva o captcha uma vez no navegador do servidor (<code>node scripts/resolver-waf.mjs {cnpj || "<CNPJ>"}</code>) e depois reconecte em <a href="/empresas" style={{color:"#b91c1c"}}>Empresas → Conectar</a>.</> : <>Sessão expirou — relogin automático em andamento. Se persistir, reconecte a empresa em <a href="/empresas" style={{color:"#b91c1c"}}>Empresas → Conectar</a>.</>}</div>}
      </div>
      {!watching && !live?.itens?.length ? (
        <div style={{ marginTop:14, background:"#fff", border:"1px dashed #cbd5e1", borderRadius:14, padding:18 }}>
          <b style={{ fontSize:13 }}>Como começar (30 segundos)</b>
          <ol style={{ margin:"8px 0 0", paddingLeft:18, fontSize:13, color:"#475569", lineHeight:1.7 }}>
            <li>Se já configurou o bot, clique no seu <b>pregão acima</b> — já inicia ao vivo</li>
            <li>Ou digite o <b>ID</b> e clique <b>Acompanhar</b></li>
            <li>Escolha o <b>alvo 1º→10º por lote</b> e clique <b>Ligar bot</b> — só lança se sair da posição</li>
          </ol>
        </div>
      ) : null}
      {live?.itens?.length ? (
        <>
        <div style={{ display:"flex", gap:6, marginTop:14, flexWrap:"wrap" }}>
          {ABAS.map(([key,label])=> (
            <button key={key} onClick={()=>{ setAba(key); setPagina(1); }} style={{ padding:"8px 12px", border: aba===key?"2px solid #0f172a":"1px solid #e2e8f0", borderRadius:999, background: aba===key?"#0f172a":"#fff", color: aba===key?"#fff":"#334155", fontWeight:800, fontSize:12 }}>{label} <span style={{ opacity:0.7, fontWeight:400 }}>({contagem[key] ?? 0})</span></button>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, gap:12, flexWrap:"wrap" }}>
          <div style={{ fontSize:12, color:"#475569" }}><b>{totalItens}</b> em <b>{aba}</b> • página <b>{paginaSafe}</b>/<b>{totalPaginas}</b> • 10 por página</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaSafe<=1} style={{ padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:8, background: paginaSafe<=1?"#f1f5f9":"#fff", fontWeight:700, opacity:paginaSafe<=1?0.5:1 }}>‹ Anterior</button>
            <div style={{ display:"flex", gap:4 }}>
              {Array.from({length: Math.min(totalPaginas, 10)}, (_,i)=>{
                let n=i+1;
                if(totalPaginas>10){
                  if(paginaSafe>5 && paginaSafe<totalPaginas-4){ n = paginaSafe-5+i; }
                  else if(paginaSafe>=totalPaginas-4){ n = totalPaginas-9+i; }
                }
                return <button key={n} onClick={()=>setPagina(n)} style={{ width:32, height:32, border: paginaSafe===n?"2px solid #0f172a":"1px solid #e2e8f0", borderRadius:8, background: paginaSafe===n?"#0f172a":"#fff", color: paginaSafe===n?"#fff":"#111", fontWeight:700, fontSize:12 }}>{n}</button>;
              })}
            </div>
            <button onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaSafe>=totalPaginas} style={{ padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:8, background: paginaSafe>=totalPaginas?"#f1f5f9":"#fff", fontWeight:700, opacity:paginaSafe>=totalPaginas?0.5:1 }}>Próxima ›</button>
          </div>
        </div>
        <div style={{ display:"grid", gap:10, marginTop:10 }}>
          {itensPagina.map((it:any)=> {
            const pos = it.posicao ?? (it.posicaoRaw ? (isNaN(Number(it.posicaoRaw))? it.posicaoRaw : `${it.posicaoRaw}º`) : null);
            const posNum = it.posicao;
            const norm = (s:any)=> { const t = String(s ?? "").trim(); const n = t.replace(/^0+/,""); return n === "" ? "0" : n; };
            const disputaLote = disputaAtiva?.itens?.find((x:any)=> norm(x.loteId)===norm(it.numero)||norm(x.loteId)===norm(it.id)||String(x.id)===String(it.id));
            const cfgFallback = disputaAtiva ? (autoCfg[`${disputaAtiva.id}:${it.numero}`] ?? autoCfg[`${disputaAtiva.id}:${it.id}`] ?? (()=>{ for(const k of Object.keys(autoCfg)){ const [, ...rest] = k.split(":"); if(norm(rest.join(":"))===norm(it.numero)||norm(rest.join(":"))===norm(it.id)) return autoCfg[k]; } return undefined; })()) : undefined;
            const alvo = disputaLote ? (Number(disputaLote.posicaoAlvo)||1) : (cfgFallback ?? 1);
            const estaNoAlvo = posNum!=null && posNum===alvo;
            const precisaLance = posNum!=null && posNum>alvo;
            const referencia = it.referencia ?? null;
            const percExeq = Number((disputaAtiva as any)?.exequibilidade ?? 50) || 50;
            const exeq = referencia!=null && isFinite(Number(referencia)) ? Number(referencia)*(percExeq/100) : null;
            const piso = disputaLote?.piso ?? null;
            const itemAtivo = disputaLote ? disputaLote.ativo !== false : true;
            const abaixoExeq = exeq!=null && it.melhorLance!=null && Number(it.melhorLance) < exeq - 1e-9;
            return (
            <div key={it.id} style={{ background: abaixoExeq ? "#fff5f5" : "#fff", border: abaixoExeq ? "2px solid #dc2626" : it.temFormLance ? "2px solid #16a34a" : "1px solid #e2e8f0", borderRadius:14, padding:14, display:"grid", gridTemplateColumns:"1fr 260px", gap:12 }}>
              <div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ background:"#0f172a", color:"#fff", borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:800 }}>Lote {it.numero || it.id}</span>
                  {abaixoExeq && <span style={{ background:"#dc2626", color:"#fff", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>⚠️ INEXEQUÍVEL</span>}
                  {pos ? <span style={{ background: estaNoAlvo?"#dcfce7": precisaLance?"#fef3c7":"#f1f5f9", color: estaNoAlvo?"#166534": precisaLance?"#92400e":"#475569", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:800, border: precisaLance?"1px solid #fde68a":"1px solid transparent" }}>{it.estaVencendo ? "🏆 ": ""}{typeof pos==="number"? `${pos}º` : pos}{estaNoAlvo?" • no alvo": precisaLance?" • precisa lance":""}</span> : <span style={{ background:"#f1f5f9", padding:"2px 8px", borderRadius:999, fontSize:11 }}>{it.situacao || "aguardando"}</span>}
                  {it.estaVencendo===true ? <span style={{ background:"#16a34a", color:"#fff", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>🏆 GANHANDO</span> : it.estaVencendo===false ? <span style={{ background:"#dc2626", color:"#fff", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:800 }}>▼ PERDENDO</span> : null}
                  {it.temFormLance ? <span style={{ background:"#dcfce7", color:"#166534", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700 }}>● pode dar lance</span> : null}
                  <span style={{ fontSize:11, color:"#64748b" }}>{it.situacao || "--"}</span>
                </div>
                <div style={{ fontSize:13, color:"#334155", marginTop:6, lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{it.descricao || "Sem descrição"}</div>
                <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
                  <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color:"#64748b", fontWeight:700 }}>REFERÊNCIA</div><div style={{ fontWeight:700 }}>{it.referencia!=null?`R$ ${it.referencia}`:"--"}</div></div>
                  <div style={{ background: abaixoExeq?"#fef2f2":"#f0fdf4", border:`1px solid ${abaixoExeq?"#fecaca":"#bbf7d0"}`, borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color: abaixoExeq?"#b91c1c":"#166534", fontWeight:700 }}>EXEQUÍVEL {percExeq}%</div><div style={{ fontWeight:800, color: abaixoExeq?"#b91c1c":"#166534" }}>{exeq!=null?`R$ ${exeq.toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2})}`:"--"}</div></div>
                  {piso!=null && <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color:"#92400e", fontWeight:700 }}>SEU PISO</div><div style={{ fontWeight:800 }}>{`R$ ${Number(piso).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2})}`}</div></div>}
                  <div style={{ background: it.melhorLance!=null?"#fef2f2":"#f8fafc", border:`1px solid ${it.melhorLance!=null?"#fecaca":"#e2e8f0"}`, borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color: it.melhorLance!=null?"#b91c1c":"#64748b", fontWeight:700 }}>MENOR LANCE</div><div style={{ fontWeight:800, color: it.melhorLance!=null?"#b91c1c":"#111" }}>{it.melhorLance!=null?`R$ ${it.melhorLance}`:"--"}</div></div>
                  <div style={{ background: it.meuLance!=null?"#eff6ff":"#f8fafc", border:`1px solid ${it.meuLance!=null?"#bfdbfe":"#e2e8f0"}`, borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color: it.meuLance!=null?"#1d4ed8":"#64748b", fontWeight:700 }}>MEU LANCE</div><div style={{ fontWeight:800, color: it.meuLance!=null?"#1d4ed8":"#111" }}>{it.meuLance!=null?`R$ ${Number(it.meuLance).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2})}`:"--"}</div></div>
                  <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color:"#64748b", fontWeight:700 }}>TEMPO</div><div style={{ fontWeight:700 }}>{it.tempo || "--"}</div></div>
                  {disputaAtiva && <div style={{ background: estaNoAlvo?"#f0fdf4":"#fffbeb", border:`1px solid ${estaNoAlvo?"#bbf7d0":"#fde68a"}`, borderRadius:10, padding:"8px 10px" }}><div style={{ fontSize:10, color:"#64748b", fontWeight:700 }}>ALVO BOT</div><div style={{ fontWeight:800 }}>{alvo}º {estaNoAlvo?"✓": precisaLance?"→ vai lançar":""}</div></div>}
                </div>
                {abaixoExeq && <div style={{ marginTop:8, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"8px 10px", fontSize:12, color:"#b91c1c", fontWeight:700 }}>⚠️ Menor lance abaixo do exequível ({percExeq}% da referência) — considere parar o bot neste item.</div>}
                {disputaAtiva && (
                  <div style={{ marginTop:8, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, fontWeight:700 }}>Alvo:</span>
                    <select value={String(alvo)} onChange={e=> setPosicao(disputaAtiva.id, disputaLote ? String(disputaLote.loteId) : String(it.numero||it.id), Number(e.target.value))} style={{ padding:"6px 8px", border:"1px solid #16a34a", borderRadius:8, background:"#f0fdf4", fontWeight:800, fontSize:12 }}>{Array.from({length:10},(_,i)=> <option key={i+1} value={i+1}>{i+1}º lugar</option>)}</select>
                    <span style={{ fontSize:10, color:"#64748b" }}>1º→10º — fixa, só lança se sair da posição</span>
                    <button onClick={()=> toggleItemBot(disputaAtiva.id, disputaLote ? String(disputaLote.loteId) : String(it.numero||it.id), !itemAtivo)} style={{ marginLeft:"auto", padding:"6px 12px", background: itemAtivo?"#dc2626":"#16a34a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:11 }}>{itemAtivo?"⏸️ Parar item":"▶️ Retomar item"}</button>
                    {!itemAtivo && <span style={{ fontSize:10, color:"#b91c1c", fontWeight:700 }}>bot parado neste item</span>}
                  </div>
                )}
              </div>
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:12, alignSelf:"start" }}>
                {it.temFormLance ? (
                  <>
                    <div style={{ fontSize:11, fontWeight:800, color:"#334155" }}>Dar lance manual</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Respeita seu piso — manual</div>
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <input placeholder="99,50" value={valor[it.id]||""} onChange={e=> setValor(v=>({...v,[it.id]:e.target.value}))} style={{ flex:1, padding:10, border:"1px solid #e2e8f0", borderRadius:10 }} />
                      <button onClick={()=>enviar(it.id)} style={{ padding:"10px 14px", background:"#16a34a", color:"#fff", border:"none", borderRadius:10, fontWeight:800 }}>Enviar</button>
                    </div>
                    <div style={{ fontSize:10, color:"#64748b", marginTop:6 }}>Use vírgula. Ex: 99,50</div>
                  </>
                ) : <div style={{ fontSize:12, color:"#64748b", textAlign:"center", padding:"16px 0" }}>Sem campo de lance<br /><span style={{ fontSize:11 }}>Abre quando o lote liberar</span></div>}
              </div>
            </div>
            );
          })}
        </div>
        {totalPaginas>1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12 }}>
            <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaSafe<=1} style={{ padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff", fontWeight:700, opacity:paginaSafe<=1?0.5:1 }}>‹ Anterior</button>
            <span style={{ alignSelf:"center", fontSize:12, color:"#64748b" }}>{paginaSafe}/{totalPaginas}</span>
            <button onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaSafe>=totalPaginas} style={{ padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff", fontWeight:700, opacity:paginaSafe>=totalPaginas?0.5:1 }}>Próxima ›</button>
          </div>
        )}
        </>
      ) : watching ? <div style={{ marginTop:14, background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:18, textAlign:"center", color:"#64748b" }}>Carregando lotes... se ficar vazio, ID errado ou sessão sem itens liberados.</div> : null}
      <div style={{ marginTop:14, background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><b style={{ fontSize:13 }}>Chat do pregoeiro — {live?.chat?.length ?? 0} mensagens {watching ? "• ao vivo" : ""}</b><span style={{ fontSize:11, color:"#64748b" }}>{live?.updatedAt? `Atualizado ${new Date(live.updatedAt).toLocaleTimeString("pt-BR")}` : watching ? "Aguardando mensagens..." : "Clique em Acompanhar"}</span></div>
        <div ref={chatRef} style={{ marginTop:10, maxHeight:360, overflowY:"auto", display:"grid", gap:6, scrollBehavior:"smooth", border: live?.chat?.length ? "1px solid #f1f5f9" : "none", borderRadius:8, padding: live?.chat?.length ? 8 : 0, background: live?.chat?.length ? "#fcfcfc" : "transparent" }}>
          {live?.chat?.length ? live.chat.slice(0,100).map((m:any)=> (
            <div key={m.id} style={{ borderLeft:`3px solid ${m.nome?.startsWith("S")||m.nome?.startsWith("P")?"#2563eb":m.nome?.startsWith("F")?"#16a34a":"#94a3b8"}`, padding:"6px 10px", background:"#f8fafc", borderRadius:8, fontSize:12 }}>
              <b>{m.data} {m.hora}</b> — {m.nome} <span style={{ color:"#334155" }}>{m.mensagem}</span>
            </div>
          )) : <div style={{ color:"#94a3b8", fontSize:12, textAlign:"center", padding:12 }}>{watching ? "Nenhuma mensagem ainda — quando o pregoeiro falar aparece aqui automaticamente." : "Inicie o ao vivo para ver o chat."}</div>}
        </div>
      </div>
    </main>
  );
}
