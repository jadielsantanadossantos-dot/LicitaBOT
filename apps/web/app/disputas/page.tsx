"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
type Disputa = { id: string; processoId: string; editalId?: string; cnpj: string; modo: string; dataHora: string; status: string; itens: any[] };
const ESTRATEGIAS: Record<string,string> = {
  cobrir_minimo: "Cobre o mínimo necessário — padrão",
  agressivo: "Baixa mais que o mínimo",
  conservador: "Espera, economiza decrementos",
  sniper: "Só nos últimos segundos",
};
type Lote = { id: string; editalId: string; numero: number; descricao: string; valorReferencia?: number; intervaloMinimo?: number; quantidade?: number; unidade?: string };
export default function DisputasPage() {
  const [lista, setLista] = useState<Disputa[]>([]); const [cnpjs, setCnpjs] = useState<{ cnpj: string; apelido?: string; razaoSocial?: string }[]>([]);
  const [form, setForm] = useState({ processoId: "", editalId: "", cnpj: "", modo: "ABERTO", dataHora: "", exequibilidade: "50" });
  const [msg, setMsg] = useState(""); const [loading, setLoading] = useState(false);
  const [editalInfo, setEditalInfo] = useState<any>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [cfg, setCfg] = useState<Record<string,{piso:string,decremento:string,estrategia:string,ativo:boolean,posicaoAlvo:number}>>({});
  const [arquivos, setArquivos] = useState<{href:string,label:string}[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lotesEdital, setLotesEdital] = useState<string>("");
  const [alvoTodos, setAlvoTodos] = useState("1");
  const [decrementoTodos, setDecrementoTodos] = useState("0.10");
  const [estrategiaTodos, setEstrategiaTodos] = useState("cobrir_minimo");

  function aplicarEmTodos(patch: { posicaoAlvo?: number; decremento?: string; estrategia?: string }){
    setCfg((s)=>{
      const next = { ...s };
      for(const l of lotes){
        const cur = next[l.id] || { piso:"", decremento:"0.10", estrategia:"cobrir_minimo", ativo:true, posicaoAlvo: 1 };
        next[l.id] = { ...cur, ...patch };
      }
      return next;
    });
  }

  function aplicarAlvoEmTodos(){
    const v = Number(alvoTodos) || 1;
    aplicarEmTodos({ posicaoAlvo: v });
  }

  async function load() {
    const [d, c] = await Promise.all([fetch(`${API}/api/disputas`).then((r) => r.json()).catch(()=>[]), fetch(`${API}/api/cnpjs`).then((r) => r.json()).catch(()=>[])]);
    setLista(Array.isArray(d) ? d : []); setCnpjs(Array.isArray(c) ? c : []);
    if (Array.isArray(c) && c.length) {
      // Prioriza a empresa que fez login (sessão ativa) — evita criar disputa no CNPJ errado
      const onlyDigits = (v: any) => String(v || "").replace(/\D/g, "");
      let logada = "";
      try {
        const s = JSON.parse(sessionStorage.getItem("licitabot.login") || "null");
        if (s?.cnpj) logada = onlyDigits(s.cnpj);
      } catch {}
      if (!logada) {
        try {
          logada = onlyDigits(localStorage.getItem("licitabot.lastCnpj") || localStorage.getItem("licitabot.cnpj") || "");
        } catch {}
      }
      const alvo = (c as any[]).find((x) => onlyDigits(x.cnpj) === logada) ?? (c as any[])[0];
      setForm((f) => {
        // Em edição, iniciarEdicao() já definiu o CNPJ da disputa — não sobrescreve
        if (f.cnpj) return f;
        return { ...f, cnpj: alvo.cnpj };
      });
    }
  }

  async function carregarLotes(editalId: string, opts?: { forcar?: boolean }){
    if(!editalId) return;
    // Evita recarregar o mesmo edital e zerar o que o usuário já preencheu
    if(!opts?.forcar && editalId === lotesEdital && lotes.length) return;
    setLoadingLotes(true);
    try{
      const [rLotes, rArq] = await Promise.all([
        fetch(`${API}/api/editais/${editalId}/lotes`),
        fetch(`${API}/api/editais/${editalId}/arquivos`).catch(()=>null),
      ]);
      const j = await rLotes.json().catch(()=>[]);
      const arr = Array.isArray(j) ? j : [];
      if(!arr.length){ setLoadingLotes(false); return; }
      setLotes(arr);
      setLotesEdital(editalId);
      // Merge: preserva piso/decremento/estratégia/alvo/ativo já preenchidos
      setCfg((prev)=>{
        const next: Record<string,{piso:string,decremento:string,estrategia:string,ativo:boolean,posicaoAlvo:number}> = {};
        for(const l of arr){
          const antigo = prev[l.id];
          if(antigo) next[l.id] = antigo;
          else next[l.id] = { piso: "", decremento: l.intervaloMinimo != null ? String(l.intervaloMinimo) : "0.10", estrategia: "cobrir_minimo", ativo: true, posicaoAlvo: 1 };
        }
        return next;
      });
      if(rArq){
        const aj = await rArq.json().catch(()=>null);
        if(aj?.arquivos?.length) setArquivos(aj.arquivos);
        else if(editalId !== lotesEdital) setArquivos([]);
      }
    }catch{ /* não zera lotes/cfg em erro de rede — mantém o preenchido */ }
    setLoadingLotes(false);
  }

  async function iniciarEdicao(id: string){
    setLoading(true); setMsg("");
    try{
      const r = await fetch(`${API}/api/disputas/${id}`); const d = await r.json();
      if(!r.ok){ setMsg("Erro ao carregar: "+JSON.stringify(d)); setLoading(false); return; }
      setEditingId(id);
      const dtLocal = d.dataHora ? new Date(new Date(d.dataHora).getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16) : "";
      setForm({ processoId: d.processoId, editalId: d.editalId || d.processoId, cnpj: d.cnpj, modo: d.modo, dataHora: dtLocal, exequibilidade: String((d as any).exequibilidade ?? 50) });
      setEditalInfo({ id: d.editalId || d.processoId, numero: d.processoId });
      const eid = d.editalId || d.processoId;
      let lotesCarregados: Lote[] = [];
      try{ const rl = await fetch(`${API}/api/editais/${eid}/lotes`); const jl = await rl.json().catch(()=>[]); lotesCarregados = Array.isArray(jl)? jl:[]; }catch{}
      if(lotesCarregados.length){
        setLotes(lotesCarregados);
        const next: Record<string,{piso:string,decremento:string,estrategia:string,ativo:boolean,posicaoAlvo:number}> = {};
        for(const l of lotesCarregados){
          const it = d.itens?.find((x:any)=> String(x.loteId)===String(l.numero) || String(x.loteId)===String(l.id));
          if(it) next[l.id] = { piso: it.piso==null?"":String(it.piso), decremento: String(it.decremento), estrategia: it.estrategia||"cobrir_minimo", ativo: it.ativo!==false, posicaoAlvo: Number(it.posicaoAlvo)||1 };
          else next[l.id] = { piso: "", decremento: l.intervaloMinimo!=null?String(l.intervaloMinimo):"0.10", estrategia:"cobrir_minimo", ativo:false, posicaoAlvo: 1 };
        }
        for(const it of d.itens||[]){
          const found = lotesCarregados.find(x=> String(x.numero)===String(it.loteId) || String(x.id)===String(it.loteId));
          if(!found){
            const synId = String(it.loteId);
            if(!lotesCarregados.find(x=> x.id===synId)){
              lotesCarregados.push({ id: synId, editalId: eid, numero: Number(it.loteId)||0, descricao: it.descricao||`Lote ${it.loteId}`, valorReferencia: it.piso, intervaloMinimo: it.intervaloMinimo } as any);
              next[synId] = { piso: it.piso==null?"":String(it.piso), decremento: String(it.decremento), estrategia: it.estrategia||"cobrir_minimo", ativo: it.ativo!==false, posicaoAlvo: Number(it.posicaoAlvo)||1 };
            }
          }
        }
        setLotes([...lotesCarregados]); setCfg(next); setLotesEdital(eid);
      } else {
        const syn: Lote[] = (d.itens||[]).map((it:any)=> ({ id: String(it.loteId), editalId: eid, numero: Number(it.loteId)||0, descricao: it.descricao||`Lote ${it.loteId}`, valorReferencia: it.piso, intervaloMinimo: it.intervaloMinimo } as any));
        setLotes(syn);
        const next: Record<string,{piso:string,decremento:string,estrategia:string,ativo:boolean,posicaoAlvo:number}> = {};
        for(const it of d.itens||[]) next[String(it.loteId)] = { piso: it.piso==null?"":String(it.piso), decremento: String(it.decremento), estrategia: it.estrategia||"cobrir_minimo", ativo: it.ativo!==false, posicaoAlvo: Number(it.posicaoAlvo)||1 };
        setCfg(next); setLotesEdital(eid);
      }
      window.scrollTo({ top:0, behavior:"smooth" });
    }finally{ setLoading(false); }
  }
  function resetForm(){
    setEditingId(null); setLotes([]); setCfg({}); setArquivos([]);
    setEditalInfo(null); setLotesEdital("");
    setForm((f)=> ({ processoId: "", editalId: "", cnpj: f.cnpj, modo: "ABERTO", dataHora: "", exequibilidade: "50" }));
    history.replaceState(null,"","/disputas");
  }
  function cancelarEdicao(){ resetForm(); setMsg("Edição cancelada — formulário limpo"); }
  async function excluirDisputa(id:string){
    if(!confirm(`Excluir disputa ${id}?`)) return;
    await fetch(`${API}/api/disputas/${id}`,{method:"DELETE"});
    if(editingId===id) setEditingId(null);
    load();
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const edit = sp.get("edit");
    const eid = sp.get("editalId"); const lote = sp.get("loteId");
    if(edit){ iniciarEdicao(edit); load(); return; }
    if (eid) {
      setForm((f) => ({ ...f, editalId: eid, processoId: f.processoId || eid }));
      fetch(`${API}/api/editais/${eid}`).then(r=>r.json()).then(setEditalInfo).catch(()=> setEditalInfo({ id:eid, numero:eid, url:`https://operacao.portaldecompraspublicas.com.br/4/Pregoes/DadosPregao/?ttCD_CHAVE=${eid}` }));
      carregarLotes(eid);
    }
    load();
  }, []);

  async function criar() {
    setLoading(true); setMsg("");
    if (!form.cnpj) { setMsg("Selecione o CNPJ"); setLoading(false); return; }
    if (!form.processoId) { setMsg("Informe o ID do edital"); setLoading(false); return; }
    // Aviso local anti-duplicata (o backend também bloqueia com 409)
    if (!editingId) {
      const dupLocal = lista.find((x:any)=> String(x.processoId)===String(form.processoId) && String(x.cnpj).replace(/\D/g,"")===String(form.cnpj).replace(/\D/g,"") && (x.status==="agendada"||x.status==="em_andamento"));
      if (dupLocal) { setMsg(`❌ Já existe disputa ${dupLocal.id} para o pregão ${form.processoId} com este CNPJ ${form.cnpj}. Para 2 empresas, troque "Empresa que vai disputar" para o outro CNPJ antes de criar. Se foi erro, exclua a duplicata abaixo.`); setLoading(false); return; }
    }
    let itens: any[] = [];
    if(lotes.length){
      for(const l of lotes){
        const c = cfg[l.id];
        if(!c || !c.ativo) continue;
        const rawPiso = String(c.piso ?? "").trim();
        const piso = rawPiso ? Number(rawPiso.replace(",",".")) : null;
        const dec = Number(String(c.decremento).replace(",","."));
        if(!dec) continue;
        if(piso != null && (isNaN(piso) || piso < 0)) continue;
        itens.push({ id: `${l.id}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, loteId: String(l.numero ?? l.id), descricao: l.descricao, piso, decremento: dec, intervaloMinimo: l.intervaloMinimo, estrategia: c.estrategia, ativo: true, posicaoAlvo: Number(c.posicaoAlvo)||1 });
      }
      if(!itens.length){ setMsg("Selecione ao menos 1 lote e preencha decremento (piso pode ficar em branco = sem limite)"); setLoading(false); return; }
    } else {
      setMsg("Nenhum lote carregado — adicione manualmente ou aguarde liberação do pregão. Carregando lotes...");
      await carregarLotes(form.editalId || form.processoId);
      setLoading(false); return;
    }
    const exeqNum = Number(String(form.exequibilidade).replace(",",".")) || 50;
    if (exeqNum < 10 || exeqNum > 100) { setMsg("Exequibilidade deve ser 10..100 (%)"); setLoading(false); return; }
    const body:any = {
      processoId: form.processoId, editalId: form.editalId || undefined, cnpj: form.cnpj.replace(/\D/g,""), modo: form.modo,
      dataHora: form.dataHora ? new Date(form.dataHora).toISOString() : new Date(Date.now() + 3600000).toISOString(),
      status: "agendada", exequibilidade: exeqNum, itens,
    };
    const isEdit = !!editingId;
    const url = isEdit ? `${API}/api/disputas/${editingId}` : `${API}/api/disputas`;
    const method = isEdit ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) setMsg("Erro: " + JSON.stringify(j, null, 2));
    else {
      setMsg(isEdit ? `✅ Disputa atualizada: ${j.id} • ${itens.length} lote(s)` : "✅ Disputa criada: " + j.id + ` • ${itens.length} lote(s) — vá em Agenda / Ao vivo`);
      if(isEdit){ setEditingId(null); history.replaceState(null,"","/disputas"); setLotesEdital(""); }
      load();
    }
    setLoading(false);
  }

  const portalUrl = form.editalId ? `https://operacao.portaldecompraspublicas.com.br/4/Pregoes/DadosPregao/?ttCD_CHAVE=${form.editalId}` : null;
  const totalAtivos = Object.values(cfg).filter(c=>c.ativo).length;
  const exeqPct = Number(String(form.exequibilidade).replace(",",".")) || 50;
  const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ background: editingId ? "#2563eb" : "#16a34a", color: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>{editingId ? "EDITANDO" : "PASSO 2"}</span><h1 style={{ margin: 0, fontSize: 20 }}>{editingId ? `Editando pregão ${editingId.slice(0,8)}…` : "Configurar bot para disputar"}</h1>{editingId && <button onClick={cancelarEdicao} style={{ marginLeft:8, padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff", fontSize:12, fontWeight:700 }}>✕ Cancelar</button>}</div>
        <p style={{ color: "#64748b", fontSize: 13, margin: "8px 0 0" }}>{editingId ? <>Alterando disputa agendada — ajuste <b>piso/decremento/data/hora</b> e clique em <b>Atualizar</b>. <a href="/agenda" style={{color:"#2563eb"}}>Ver agenda</a></> : <>Todos os <b>lotes/itens</b> do pregão aparecem abaixo com <b>preço de referência</b>. Ajuste <b>piso</b> e <b>decremento</b> por lote e crie a disputa.</>}</p>
        {form.editalId ? (
          <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 10, fontSize: 12, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
            <div><b>Edital:</b> {form.editalId} {editalInfo ? `• ${editalInfo.numero || ""} — ${(editalInfo.objeto||"").slice(0,90)}` : ""}</div>
            <div style={{ display:"flex", gap:8 }}>
              {portalUrl && <a href={portalUrl} target="_blank" style={{ background:"#0f172a", color:"#fff", padding:"6px 10px", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700 }}>📄 Ver edital no Portal</a>}
              <a href="/editais" style={{ color: "#16a34a", fontWeight:700, padding:"6px 10px", border:"1px solid #bbf7d0", borderRadius:8, background:"#fff", textDecoration:"none", fontSize:12 }}>Trocar edital</a>
            </div>
          </div>
        ) : <div style={{ marginTop: 10, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: 10, fontSize: 12 }}>Nenhum edital selecionado — <a href="/editais" style={{ color: "#92400e", fontWeight: 700 }}>vá em Buscar edital</a> e clique em <b>Configurar bot</b>.</div>}
      </div>

      <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
        <b style={{ fontSize: 13 }}>Dados da disputa</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Edital / Processo ID <input value={form.processoId} onChange={(e) => { const v=e.target.value; setForm({ ...form, processoId: v, editalId: v }); }} onBlur={(e)=>{ const v=e.target.value.trim(); if(v && v !== lotesEdital) carregarLotes(v); }} onKeyDown={(e)=>{ if(e.key==="Enter"){ const v=(e.target as HTMLInputElement).value.trim(); if(v && v !== lotesEdital) carregarLotes(v); } }} placeholder="ID do edital" style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }} /><span style={{ fontWeight:400, color:"#64748b" }}>Cole o ID (ex: 504989) — lotes carregam ao sair do campo</span></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Empresa que vai disputar <select value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} style={{ padding: 10, border: "2px solid #16a34a", borderRadius: 10, background: "#f0fdf4" }}>{cnpjs.length? cnpjs.map(c=> {
            let marca = "";
            try {
              const s = JSON.parse(sessionStorage.getItem("licitabot.login") || "null");
              if (s?.cnpj && String(s.cnpj).replace(/\D/g, "") === String(c.cnpj).replace(/\D/g, "")) marca = " ★ logada";
            } catch {}
            return <option key={c.cnpj} value={c.cnpj}>{c.razaoSocial || c.apelido || c.cnpj} — {c.cnpj}{marca}</option>;
          }) : <option value="">cadastre em Empresas</option>}</select><span style={{ fontWeight:400, color:"#166534" }}>Pré-selecionada = empresa do login ★ • <a href="/empresas" style={{color:"#2563eb"}}>Gerenciar</a></span></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Modo <select value={form.modo} onChange={(e) => setForm({ ...form, modo: e.target.value })} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }}><option value="ABERTO">ABERTO</option><option value="ABERTO_FECHADO">ABERTO_FECHADO</option><option value="FECHADO">FECHADO</option></select></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Exequibilidade (%) <select value={["50","65","70","75"].includes(form.exequibilidade) ? form.exequibilidade : "custom"} onChange={(e) => { const v=e.target.value; if(v!=="custom") setForm({ ...form, exequibilidade: v }); else setForm({ ...form, exequibilidade: "50" }); }} style={{ padding: 10, border: "2px solid #f59e0b", borderRadius: 10, background: "#fffbeb" }}><option value="50">50% — padrão</option><option value="65">65%</option><option value="70">70%</option><option value="75">75%</option><option value="custom">Outro…</option></select><span style={{ display:"flex", gap:6, alignItems:"center" }}><input value={form.exequibilidade} onChange={(e) => setForm({ ...form, exequibilidade: e.target.value.replace("%","") })} placeholder="50" style={{ width:70, padding:8, border:"1px solid #e2e8f0", borderRadius:8 }} /><span style={{ fontWeight:400, color:"#64748b" }}>% da referência — varia por edital</span></span></label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155", marginTop:10, maxWidth:380 }}>Data/hora da sessão <input type="datetime-local" value={form.dataHora} onChange={(e) => setForm({ ...form, dataHora: e.target.value })} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }} /><span style={{ fontWeight: 400, color: "#64748b" }}>Quando o pregão abre — vazio = em 1h</span></label>
      </div>

      <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <b style={{ fontSize: 13 }}>Lotes do pregão {loadingLotes ? "— carregando..." : `• ${lotes.length} item(ns)`} {totalAtivos ? `• ${totalAtivos} selecionado(s)` : ""}</b>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=> form.editalId && carregarLotes(form.editalId, { forcar: true })} style={{ padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff", fontSize:12, fontWeight:700 }}>↻ Recarregar lotes</button>
            {arquivos.length ? arquivos.map((a,i)=> <a key={i} href={a.href} target="_blank" style={{ padding:"6px 10px", background:"#2563eb", color:"#fff", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700 }}>📥 {a.label}</a>) : portalUrl && <a href={portalUrl} target="_blank" style={{ padding:"6px 10px", background:"#2563eb", color:"#fff", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700 }}>📥 Ver edital no Portal</a>}
          </div>
        </div>

        {!form.editalId ? <div style={{ marginTop:10, color:"#64748b", fontSize:12 }}>Informe o ID do edital acima para carregar os lotes.</div>
        : loadingLotes ? <div style={{ marginTop:10, color:"#64748b", fontSize:12 }}>Buscando lotes no Portal (precisa sessão válida)...</div>
        : lotes.length ? (
          <div style={{ marginTop:12, display:"grid", gap:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"8px 10px" }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#166534" }}>Aplicar em todos ({lotes.length}):</span>
              <label style={{ display:"flex", gap:4, alignItems:"center", fontSize:12, fontWeight:700 }}>Alvo <select value={alvoTodos} onChange={e=> setAlvoTodos(e.target.value)} style={{ padding:"6px 8px", border:"1px solid #16a34a", borderRadius:8, background:"#fff", fontWeight:800, fontSize:12 }}>{Array.from({length:10},(_,i)=> <option key={i+1} value={i+1}>{i+1}º</option>)}</select></label>
              <button onClick={aplicarAlvoEmTodos} style={{ padding:"6px 12px", background:"#16a34a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12 }}>Alvo</button>
              <label style={{ display:"flex", gap:4, alignItems:"center", fontSize:12, fontWeight:700 }}>Decremento <input value={decrementoTodos} onChange={e=> setDecrementoTodos(e.target.value)} placeholder="0,10" style={{ width:70, padding:"6px 8px", border:"1px solid #16a34a", borderRadius:8, background:"#fff", fontWeight:800, fontSize:12 }} /></label>
              <button onClick={()=> { const v = String(decrementoTodos).replace(",",".").trim(); if(!v || isNaN(Number(v)) || Number(v) <= 0) return; aplicarEmTodos({ decremento: String(decrementoTodos) }); }} style={{ padding:"6px 12px", background:"#16a34a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12 }}>Decremento</button>
              <label style={{ display:"flex", gap:4, alignItems:"center", fontSize:12, fontWeight:700 }}>Estratégia <select value={estrategiaTodos} onChange={e=> setEstrategiaTodos(e.target.value)} style={{ padding:"6px 8px", border:"1px solid #16a34a", borderRadius:8, background:"#fff", fontWeight:800, fontSize:12 }}>{Object.keys(ESTRATEGIAS).map(k=> <option key={k} value={k}>{k}</option>)}</select></label>
              <button onClick={()=> aplicarEmTodos({ estrategia: estrategiaTodos })} style={{ padding:"6px 12px", background:"#16a34a", color:"#fff", border:"none", borderRadius:8, fontWeight:800, fontSize:12 }}>Estratégia</button>
              <span style={{ fontSize:11, color:"#64748b" }}>cada botão aplica só o seu campo — o individual abaixo continua valendo</span>
            </div>
            {lotes.map((l)=> {
              const c = cfg[l.id] || { piso:"", decremento:"0.10", estrategia:"cobrir_minimo", ativo:true, posicaoAlvo: 1 };
              return (
                <div key={l.id} style={{ border: c.ativo ? "1px solid #e2e8f0" : "1px dashed #cbd5e1", borderRadius:12, padding:12, background: c.ativo ? "#fff" : "#f8fafc", opacity: c.ativo ? 1 : 0.7, display:"grid", gridTemplateColumns:"1fr 320px", gap:12 }}>
                  <div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input type="checkbox" checked={c.ativo} onChange={e=> setCfg(s=> ({...s, [l.id]: {...c, ativo:e.target.checked}}))} />
                      <span style={{ background:"#0f172a", color:"#fff", borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:800 }}>Lote {l.numero}</span>
                      {l.valorReferencia != null && <span style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:700 }}>Ref R$ {brl(Number(l.valorReferencia))}</span>}
                      {l.valorReferencia != null && <span title={`${exeqPct}% do valor de referência — abaixo disso o lance pode ser considerado inexequível`} style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:700, color:"#166534" }}>Exeq {exeqPct}% R$ {brl(Number(l.valorReferencia)*exeqPct/100)}</span>}
                      {l.intervaloMinimo != null && <span style={{ fontSize:11, color:"#64748b" }}>intervalo mín R$ {l.intervaloMinimo}</span>}
                    </div>
                    <div style={{ fontSize:13, color:"#334155", marginTop:6, lineHeight:1.4 }}>{l.descricao || `Item ${l.id}`}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{[l.quantidade && `Qtd ${l.quantidade} ${l.unidade||""}`, l.id].filter(Boolean).join(" • ")}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, alignContent:"start" }}>
                    <label style={{ display:"flex", flexDirection:"column", gap:4, fontSize:10, fontWeight:700 }}>PISO (R$) <input value={c.piso} onChange={e=> setCfg(s=> ({...s, [l.id]: {...c, piso:e.target.value}}))} disabled={!c.ativo} placeholder="vazio = sem limite" style={{ padding:8, border:"1px solid #e2e8f0", borderRadius:8, background: c.ativo ? "#fff" : "#f1f5f9" }} /><span style={{ fontWeight:400, color:"#64748b", fontSize:9 }}>{c.piso ? `limite R$ ${c.piso}` : l.valorReferencia!=null ? `sugestão: R$ ${brl(Number(l.valorReferencia)*exeqPct/100)} (exeq ${exeqPct}%)` : "sem limite — só para na posição"}</span></label>
                    <label style={{ display:"flex", flexDirection:"column", gap:4, fontSize:10, fontWeight:700 }}>DECREMENTO <input value={c.decremento} onChange={e=> setCfg(s=> ({...s, [l.id]: {...c, decremento:e.target.value}}))} disabled={!c.ativo} placeholder="0,10" style={{ padding:8, border:"1px solid #e2e8f0", borderRadius:8, background:"#fff" }} /></label>
                    <label style={{ display:"flex", flexDirection:"column", gap:4, fontSize:10, fontWeight:700 }}>Alvo 1º→10º <select value={String(c.posicaoAlvo||1)} onChange={e=> setCfg(s=> ({...s, [l.id]: {...c, posicaoAlvo: Number(e.target.value)}}))} disabled={!c.ativo} style={{ padding:8, border:"1px solid #16a34a", borderRadius:8, background:"#f0fdf4", fontWeight:800 }}>{Array.from({length:10},(_,i)=> <option key={i+1} value={i+1}>{i+1}º lugar</option>)}</select><span style={{ fontWeight:400, color:"#64748b", fontSize:9 }}>Fixa — só lança se sair do {c.posicaoAlvo||1}º</span></label>
                    <label style={{ display:"flex", flexDirection:"column", gap:4, fontSize:10, fontWeight:700 }}>Estratégia <select value={c.estrategia} onChange={e=> setCfg(s=> ({...s, [l.id]: {...c, estrategia:e.target.value}}))} disabled={!c.ativo} style={{ padding:8, border:"1px solid #e2e8f0", borderRadius:8, background:"#fff" }}>{Object.keys(ESTRATEGIAS).map(k=> <option key={k} value={k}>{k}</option>)}</select><span style={{ fontWeight:400, color:"#64748b", fontSize:9 }}>{ESTRATEGIAS[c.estrategia]}</span></label>
                  </div>
                </div>
              );
            })}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={criar} disabled={loading || !form.processoId || totalAtivos===0} style={{ flex:1, padding: 14, background: (!form.processoId || totalAtivos===0) ? "#94a3b8" : editingId ? "#2563eb" : "#16a34a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, opacity: loading?0.6:1 }}>{loading ? (editingId?"Atualizando...":"Criando...") : editingId ? `✓ Atualizar pregão • ${totalAtivos} lote(s)` : `✓ Criar disputa com ${totalAtivos} lote(s)`}</button>
              {editingId && <button onClick={cancelarEdicao} style={{ padding:"14px 16px", border:"1px solid #e2e8f0", borderRadius:10, background:"#fff", fontWeight:800, fontSize:13 }}>Cancelar</button>}
            </div>
            {msg && <pre style={{ background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`, padding: 10, borderRadius: 10, fontSize: 12, whiteSpace: "pre-wrap" }}>{msg}</pre>}
          </div>
        ) : (
          <div style={{ marginTop:10, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:12, fontSize:12 }}>
            Nenhum lote retornado — o pregão pode ainda não ter liberado os itens (só na sessão) ou precisa de sessão válida no Portal. Você pode recarregar ou abrir o edital no Portal para conferir. <a href={portalUrl||"#"} target="_blank" style={{ color:"#92400e", fontWeight:700 }}>Abrir edital</a>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}><b style={{ fontSize: 13 }}>Pregões registrados — separados por empresa</b><a href="/agenda" style={{ fontSize: 12, color: "#2563eb" }}>Ver agenda →</a></div>
        {lista.length ? (
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {(() => {
              const porEmpresa = new Map<string, Disputa[]>();
              for (const d of lista) {
                const k = String(d.cnpj).replace(/\D/g, "");
                if (!porEmpresa.has(k)) porEmpresa.set(k, []);
                porEmpresa.get(k)!.push(d);
              }
              return [...porEmpresa.entries()].map(([cnpj, disputas]) => {
                const emp = cnpjs.find((x) => String(x.cnpj).replace(/\D/g, "") === cnpj);
                return (
                <section key={cnpj} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>🏢 {emp?.razaoSocial || emp?.apelido || cnpj} <span style={{ fontWeight: 400, color: "#64748b" }}>• {cnpj} • {disputas.length} pregão(ões)</span></div>
                  <div style={{ display: "grid", gap: 8 }}>
                  {disputas.map((d)=> (
              <div key={d.id} style={{ border: editingId===d.id ? "2px solid #2563eb" : "1px solid #e2e8f0", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: editingId===d.id ? "#eff6ff" : "#fff" }}>
                <div><div style={{ fontWeight: 700, fontSize: 12 }}>{d.id} • {d.processoId} {editingId===d.id && <span style={{ background:"#2563eb", color:"#fff", padding:"2px 6px", borderRadius:999, fontSize:10 }}>EDITANDO</span>}</div><div style={{ fontSize: 12, color: "#64748b" }}>{d.cnpj} • {d.modo} • {new Date(d.dataHora).toLocaleString("pt-BR")} • <span style={{ background: d.status==="agendada"?"#fef3c7": d.status==="em_andamento"?"#dcfce7":"#e2e8f0", padding: "2px 6px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{d.status}</span></div><div style={{ fontSize: 11, color:"#475569", marginTop:4 }}>{d.itens.length} lote(s) • {d.itens.slice(0,4).map((it:any)=> `L${it.loteId} ${it.piso==null?"sem piso":`R$${it.piso}`}`).join(", ")}{d.itens.length>4?` +${d.itens.length-4}`:""}</div></div>
                <div style={{ display:"flex", gap:6, alignItems:"center", alignSelf:"center" }}>
                  <button onClick={()=> iniciarEdicao(d.id)} style={{ padding:"6px 10px", border:"1px solid #2563eb", borderRadius:8, background: editingId===d.id ? "#2563eb" : "#fff", color: editingId===d.id ? "#fff" : "#2563eb", fontWeight:800, fontSize:12 }}>✏️ Editar</button>
                  <button onClick={()=> excluirDisputa(d.id)} style={{ padding:"6px 10px", border:"1px solid #fecaca", borderRadius:8, background:"#fff", color:"#dc2626", fontWeight:700, fontSize:12 }}>🗑️</button>
                </div>
              </div>
                  ))}
                  </div>
                </section>
                );
              });
            })()}
          </div>
        ) : <p style={{ color: "#64748b", fontSize: 13 }}>Nenhuma disputa ainda.</p>}
      </div>
    </main>
  );
}
