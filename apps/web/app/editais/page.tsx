"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const FAV_KEY = "licitabot:favoritos";
type Edital = { id: string; numero: string; objeto: string; orgao: string; uf: string; municipio?: string; dataAbertura: string; modo: string; url?: string };
export default function EditaisPage() {
  const [numero, setNumero] = useState(""); const [cidade, setCidade] = useState(""); const [objeto, setObjeto] = useState(""); const [uf, setUf] = useState("");
  const [dataAbertura, setDataAbertura] = useState(""); const [dataDe, setDataDe] = useState(""); const [dataAte, setDataAte] = useState("");
  const [data, setData] = useState<Edital[]>([]); const [total, setTotal] = useState(0); const [source, setSource] = useState(""); const [loading, setLoading] = useState(false);
  const [lotes, setLotes] = useState<any[]>([]); const [sel, setSel] = useState<Edital | null>(null); const [msg, setMsg] = useState(""); const [hasSearched, setHasSearched] = useState(false);
  const [favs, setFavs] = useState<Edital[]>([]);
  const favIds = new Set(favs.map((f) => f.id));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(JSON.parse(raw));
    } catch {}
    fetch(`${API}/api/editais/favoritos`).then((r) => r.json()).then((j) => {
      if (Array.isArray(j) && j.length) { setFavs(j); try { localStorage.setItem(FAV_KEY, JSON.stringify(j)); } catch {} }
    }).catch(() => {});
  }, []);
  async function toggleFav(e: Edital) {
    const isFav = favIds.has(e.id);
    try {
      if (isFav) {
        await fetch(`${API}/api/editais/favoritos/${e.id}`, { method: "DELETE" });
        const next = favs.filter((f) => f.id !== e.id);
        setFavs(next); try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      } else {
        await fetch(`${API}/api/editais/favoritos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) });
        const next = [e, ...favs.filter((f) => f.id !== e.id)];
        setFavs(next); try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      }
    } catch {
      const next = isFav ? favs.filter((f) => f.id !== e.id) : [e, ...favs];
      setFavs(next); try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
    }
  }
  async function abrirFav(e: Edital) { await verLotes(e); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }
  async function buscar() {
    setLoading(true); setMsg(""); setHasSearched(true);
    const p = new URLSearchParams();
    const n = numero.trim(); const c = cidade.trim(); const o = objeto.trim(); const u = uf.trim().toUpperCase();
    if (n) p.set("numero", n); if (c) p.set("cidade", c); if (o) p.set("objeto", o); if (u) p.set("uf", u);
    if (dataAbertura) p.set("dataAbertura", dataAbertura); else { if (dataDe) p.set("dataDe", dataDe); if (dataAte) p.set("dataAte", dataAte); }
    p.set("page", "1"); p.set("pageSize", "50");
    try {
      const r = await fetch(`${API}/api/editais?${p.toString()}`);
      const j = await r.json();
      setData(j.data || []); setTotal(j.total || 0); setSource(j.source || "portal");
      if (!j.data?.length) setMsg("Nenhum edital com esses filtros — preencha só os campos que precisa e use data quando buscar por número.");
    } catch { setMsg("Falha ao buscar — verifique se a API está online (start.bat)."); }
    setLoading(false);
  }
  async function verLotes(e: Edital) { setSel(e); const r = await fetch(`${API}/api/editais/${e.id}/lotes`); const j = await r.json().catch(()=>[]); setLotes(Array.isArray(j)?j:[]); }
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ background: "#2563eb", color: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>PASSO 1</span><h1 style={{ margin: 0, fontSize: 20 }}>Buscar edital no Portal</h1><span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>→ depois clique em <b>Configurar bot</b></span></div>
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 1.4fr 0.5fr", gap: 8, marginTop: 14, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Número do edital <input placeholder="" value={numero} onChange={(e) => setNumero(e.target.value)} onKeyDown={(e)=> e.key==="Enter" && buscar()} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Cidade <input placeholder="" value={cidade} onChange={(e) => setCidade(e.target.value)} onKeyDown={(e)=> e.key==="Enter" && buscar()} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Objeto <input placeholder="" value={objeto} onChange={(e) => setObjeto(e.target.value)} onKeyDown={(e)=> e.key==="Enter" && buscar()} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>UF <input placeholder="" value={uf} onChange={(e) => setUf(e.target.value)} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10, textTransform: "uppercase" }} /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8, alignItems: "end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#334155" }}>Abertura exata <input type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10 }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: dataAbertura ? "#94a3b8" : "#334155" }}>De <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} disabled={!!dataAbertura} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10, opacity: dataAbertura ? 0.5 : 1 }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: dataAbertura ? "#94a3b8" : "#334155" }}>Até <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} disabled={!!dataAbertura} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 10, opacity: dataAbertura ? 0.5 : 1 }} /></label>
        </div>
        <div style={{ fontSize:11, color:"#64748b", marginTop:6 }}>Dica: para número preencha só <b>Número + UF + data</b>. Ex: 26/2026 + PB + 11/09/2026.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={buscar} disabled={loading} style={{ padding: "10px 18px", background: "#0f172a", color: "#fff", borderRadius: 10, border: "none", fontWeight: 800, opacity: loading?0.6:1 }}>{loading ? "Buscando..." : "🔍 Buscar"}</button>
          <button onClick={() => { setNumero(""); setCidade(""); setObjeto(""); setUf(""); setDataAbertura(""); setDataDe(""); setDataAte(""); setData([]); setTotal(0); setSource(""); setMsg(""); setHasSearched(false); }} style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", fontWeight: 700 }}>Limpar</button>
          <span style={{ alignSelf: "center", color: "#64748b", fontSize: 12, marginLeft: 8 }}>{total} edital(is) • fonte: <b>{source || "—"}</b></span>
        </div>
        {msg && <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 }}>{msg}</div>}
      </div>
      {favs.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 14, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 14 }}>⭐ Favoritos salvos ({favs.length})</b>
            <span style={{ fontSize: 11, color: "#92400e" }}>abre direto, sem pesquisar de novo</span>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {favs.map((f) => (
              <div key={f.id} style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{f.numero} <span style={{ fontWeight: 400, color: "#64748b" }}>• {f.uf} • {f.dataAbertura ? new Date(f.dataAbertura).toLocaleDateString("pt-BR") : "--"}</span></div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.objeto}</div>
                </div>
                <button onClick={() => abrirFav(f)} style={{ padding: "8px 12px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 12 }}>Abrir</button>
                <a href={`/disputas?editalId=${f.id}`} style={{ padding: "8px 12px", background: "#16a34a", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 800, fontSize: 12 }}>Configurar bot</a>
                <a href={`/sessao?id=${f.id}`} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, textDecoration: "none", color: "#111", fontWeight: 700 }}>Ao vivo</a>
                <button onClick={() => toggleFav(f)} title="Remover dos favoritos" style={{ padding: "8px 10px", border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 8, fontSize: 13 }}>⭐✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {data.map((e) => (
          <div key={e.id} style={{ background: "#fff", border: sel?.id===e.id?"2px solid #2563eb":"1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{e.numero}</span><span style={{ fontSize: 11, background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{e.uf}</span><span style={{ fontSize: 11, background: "#f0fdf4", padding: "2px 8px", borderRadius: 999 }}>{e.modo}</span><span style={{ fontSize: 11, color: "#64748b" }}>{e.dataAbertura ? new Date(e.dataAbertura).toLocaleString("pt-BR") : "--"}</span></div>
              <div style={{ fontWeight: 700, marginTop: 6, lineHeight: 1.4 }}>{e.objeto}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{e.orgao} {e.municipio ? `• ${e.municipio}` : ""}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <a href={`/disputas?editalId=${e.id}`} style={{ flex: 1, textAlign: "center", padding: "10px 14px", background: "#16a34a", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 13 }}>✓ Configurar bot</a>
                <button onClick={() => toggleFav(e)} title={favIds.has(e.id) ? "Remover dos favoritos" : "Salvar nos favoritos"} style={{ padding: "10px 12px", border: favIds.has(e.id) ? "1px solid #f59e0b" : "1px solid #e2e8f0", borderRadius: 10, background: favIds.has(e.id) ? "#fffbeb" : "#fff", fontSize: 16 }}>{favIds.has(e.id) ? "⭐" : "☆"}</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => verLotes(e)} style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 700 }}>Ver lotes</button>
                <a href={`/sessao?id=${e.id}`} style={{ flex: 1, textAlign: "center", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, textDecoration: "none", color: "#111", fontWeight: 700 }}>Ao vivo</a>
              </div>
            </div>
          </div>
        ))}
        {!hasSearched && !loading && data.length===0 && <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: 24, textAlign: "center", color: "#64748b" }}>Preencha os filtros e clique em <b>Buscar</b> para procurar editais.</div>}
        {hasSearched && !loading && data.length===0 && <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: 24, textAlign: "center", color: "#64748b" }}>Sem resultados — preencha pelo menos um campo.<br /><a href="/sessao" style={{ color: "#2563eb" }}>Ou teste direto na Sessão ao vivo com ID 504989</a></div>}
      </div>
      {sel && (
        <div style={{ marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Lotes de {sel.numero} — {sel.id}</b><button onClick={()=>setSel(null)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px", background: "#fff" }}>Fechar</button></div>
          <div style={{ marginTop: 10, maxHeight: 360, overflowY: "auto", display: "grid", gap: 8 }}>
            {lotes.length ? lotes.map((l:any, i:number)=> (
              <div key={i} style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Lote {l.numero ?? l.id ?? i+1} — {l.descricao || "sem descrição"}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Ref: {l.valorReferencia ? `R$ ${l.valorReferencia}` : "--"} {l.intervaloMinimo ? `• intervalo mínimo R$ ${l.intervaloMinimo}`: ""} {l.quantidade?`• qtd ${l.quantidade} ${l.unidade||""}`:""}</div>
                <a href={`/disputas?editalId=${sel.id}&loteId=${l.numero ?? l.id}`} style={{ display: "inline-block", marginTop: 8, fontSize: 12, background: "#0f172a", color: "#fff", padding: "6px 10px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Usar este lote no bot →</a>
              </div>
            )) : <div style={{ color: "#64748b", fontSize: 13 }}>Nenhum lote retornado — o edital pode exigir sessão válida. Tente abrir a <a href={`/sessao?id=${sel.id}`}>Sessão ao vivo</a>.</div>}
          </div>
        </div>
      )}
    </main>
  );
}
