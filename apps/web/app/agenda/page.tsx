"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export default function AgendaPage() {
  const [data, setData] = useState<any[]>([]);
  const [cnpjs, setCnpjs] = useState<{ cnpj: string; apelido?: string; razaoSocial?: string }[]>([]);
  const [filtro, setFiltro] = useState("");
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("licitabot.login") || "null");
      if (s?.cnpj) setFiltro(String(s.cnpj).replace(/\D/g, ""));
    } catch {}
    fetch(`${API}/api/cnpjs`).then((r) => r.json()).then((j) => { if (Array.isArray(j)) setCnpjs(j); }).catch(() => {});
    const load = () => fetch(`${API}/api/agenda`).then((r) => r.json()).then(setData).catch(()=>{});
    load(); const t = setInterval(load, 30000); return () => clearInterval(t);
  }, []);
  const nomeEmpresa = (cnpj: string) => {
    const e = cnpjs.find((x) => String(x.cnpj).replace(/\D/g, "") === String(cnpj).replace(/\D/g, ""));
    return e ? (e.razaoSocial || e.apelido || e.cnpj) : cnpj;
  };
  // Separa por empresa: filtra e depois agrupa por CNPJ — nunca mistura empresas no mesmo card
  const filtrados = filtro ? data.filter((d) => String(d.cnpj).replace(/\D/g, "") === filtro.replace(/\D/g, "")) : data;
  const porEmpresa = new Map<string, any[]>();
  for (const d of filtrados) {
    const k = String(d.cnpj).replace(/\D/g, "");
    if (!porEmpresa.has(k)) porEmpresa.set(k, []);
    porEmpresa.get(k)!.push(d);
  }
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ background: "#f59e0b", color: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>PASSO 3</span><h1 style={{ margin: 0, fontSize: 20 }}>Agenda — quando o bot entra</h1>
          <label style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 700 }}>Empresa:
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ padding: "8px 10px", border: "2px solid #0f172a", borderRadius: 10, background: "#fff", fontWeight: 700 }}>
              <option value="">Todas ({data.length})</option>
              {cnpjs.map((c) => <option key={c.cnpj} value={c.cnpj}>{c.razaoSocial || c.apelido || c.cnpj} — {c.cnpj}</option>)}
            </select>
          </label>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, margin: "8px 0 0" }}>Pregões separados por empresa — cada empresa tem seus cards. Atualiza a cada 30s • janela abre 15 min antes.</p>
      </div>
      {filtrados.length ? (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {[...porEmpresa.entries()].map(([cnpj, disputas]) => (
            <section key={cnpj} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🏢 {nomeEmpresa(cnpj)} <span style={{ fontWeight: 400, color: "#64748b" }}>• {cnpj} • {disputas.length} pregão(ões)</span></div>
              <div style={{ display: "grid", gap: 10 }}>
              {disputas.map((d) => {
                const mins = Math.round(d.msAte / 60000);
                const when = new Date(d.dataHora).toLocaleString("pt-BR");
                const isSoon = mins <= 15 && mins >= -60;
                return (
              <div key={d.id} style={{ background: "#fff", border: isSoon ? "2px solid #f59e0b" : "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Pregão {d.processoId} <span style={{ fontWeight: 400, color: "#64748b", fontFamily: "monospace", fontSize: 11 }} title={d.id}>• {d.id} • {d.itens} lote(s)</span></div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{when} • <span style={{ background: d.status==="agendada" ? "#fef3c7" : "#dcfce7", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{d.status}</span> {isSoon && <span style={{ background: "#fef3c7", padding: "2px 8px", borderRadius: 999, marginLeft: 6 }}>⏰ abre agora</span>}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: mins < 0 ? "#b91c1c" : "#334155", fontWeight: 700 }}>{mins < 0 ? `Começou há ${Math.abs(mins)} min` : mins === 0 ? "Começa agora" : `Falta ${mins} min`}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160, alignSelf: "start" }}>
                  <a href={`/sessao?id=${d.processoId}&cnpj=${d.cnpj}`} style={{ textAlign: "center", padding: "10px 14px", background: "#0f172a", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 13 }}>👁️ Abrir ao vivo</a>
                  <a href={`/disputas?edit=${d.id}`} style={{ textAlign: "center", padding: "8px 12px", border: "1px solid #2563eb", borderRadius: 10, textDecoration: "none", color: "#2563eb", fontSize: 12, background: "#eff6ff", fontWeight: 800 }}>✏️ Editar</a>
                </div>
              </div>
                );
              })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 14, background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontWeight: 800 }}>Nenhuma disputa agendada</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Vá em <a href="/editais" style={{ color: "#2563eb", fontWeight: 700 }}>Buscar edital → Configurar bot</a> e crie sua primeira disputa. Ela aparece aqui com contagem regressiva.</div>
          <a href="/editais" style={{ display: "inline-block", marginTop: 12, background: "#2563eb", color: "#fff", padding: "10px 16px", borderRadius: 10, textDecoration: "none", fontWeight: 800 }}>Buscar edital</a>
        </div>
      )}
      <div style={{ marginTop: 14, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, fontSize: 12, color: "#475569" }}>
        <b>Como usar:</b> 1) Crie a disputa no Passo 2 com data/hora da sessão • 2) Ela entra nesta agenda • 3) Clique em <b>Abrir ao vivo</b> para ver lances, chat do pregoeiro e ativar o automático.
      </div>
    </main>
  );
}
