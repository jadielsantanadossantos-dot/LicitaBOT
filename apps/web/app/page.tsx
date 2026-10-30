"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export default function Home() {
  const [stats, setStats] = useState({ api: "...", hora: "" });
  const [login, setLogin] = useState<{cnpj:string,nome:string}|null>(null);
  useEffect(() => {
    // Sessão ativa fica em sessionStorage (limpa ao fechar o navegador).
    // localStorage guarda só a dica da última empresa (pré-seleção no /login).
    try{
      const s = sessionStorage.getItem("licitabot.login");
      if(s) setLogin(JSON.parse(s));
      else window.location.href="/login";
    }catch{ window.location.href="/login"; }
    Promise.all([
      fetch(`${API}/health`).then((r) => r.json()).then((j) => (j.ok ? "online" : "erro")).catch(() => "offline"),
      fetch(`${API}/api/hora`).then((r) => r.json()).then((j) => (j.hora ? new Date(j.hora).toLocaleTimeString("pt-BR") : "--")).catch(() => "--"),
    ]).then(([api, hora]) => setStats({ api, hora }));
  }, []);
  const dotColor = stats.api === "online" ? "#22c55e" : stats.api === "..." ? "#eab308" : "#ef4444";
  const dotLabel = stats.api === "online" ? "Conectado" : stats.api === "..." ? "Conectando" : "Desconectado";
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
      {login && <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"8px 12px", fontSize:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:12 }}><span><b>Empresa ativa:</b> {login.nome} • {login.cnpj}</span><button onClick={()=>{ try{ sessionStorage.removeItem("licitabot.login"); }catch{} window.location.href="/login"; }} style={{ color:"#16a34a", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>Trocar</button></div>}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span title={dotLabel} style={{ width: 10, height: 10, borderRadius: 999, background: dotColor, display: "inline-block", boxShadow: dotColor === "#22c55e" ? "0 0 0 4px rgba(34,197,94,0.25)" : dotColor === "#eab308" ? "0 0 0 4px rgba(234,179,8,0.25)" : "0 0 0 4px rgba(239,68,68,0.2)" }} />
          <b>{dotLabel}</b> {stats.hora ? `• hora servidor ${stats.hora}` : ""}
        </span>
      </div>
      <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.5 }}>Em 3 passos: encontre, configure e deixe o bot disputar</h1>
        <p style={{ color: "#64748b", margin: "8px 0 0" }}>Fluxo guiado para o Portal de Compras Públicas. O bot só dá lance se respeitar seu piso e decremento.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 18 }}>
          <a href="/editais" style={{ textDecoration: "none", color: "inherit", border: "2px solid #2563eb", borderRadius: 14, padding: 16, background: "#eff6ff" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", letterSpacing: 0.6 }}>PASSO 1</div>
            <div style={{ fontWeight: 800, marginTop: 4, fontSize: 18 }}>Buscar edital</div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Procure por objeto, cidade ou UF. Ex: “alimentos Sapé” ou UF = PB. Depois clique em <b>Configurar bot</b>.</div>
            <div style={{ marginTop: 10, background: "#2563eb", color: "#fff", display: "inline-block", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Buscar agora →</div>
          </a>
          <a href="/disputas" style={{ textDecoration: "none", color: "inherit", border: "2px solid #16a34a", borderRadius: 14, padding: 16, background: "#f0fdf4" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", letterSpacing: 0.6 }}>PASSO 2</div>
            <div style={{ fontWeight: 800, marginTop: 4, fontSize: 18 }}>Configurar bot</div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Defina por lote: <b>piso</b> (mínimo) e <b>decremento</b> (quanto abaixar). Escolha estratégia: <i>cobrir mínimo</i> é o padrão.</div>
            <div style={{ marginTop: 10, background: "#16a34a", color: "#fff", display: "inline-block", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Criar disputa →</div>
          </a>
          <a href="/agenda" style={{ textDecoration: "none", color: "inherit", border: "2px solid #f59e0b", borderRadius: 14, padding: 16, background: "#fffbeb" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#d97706", letterSpacing: 0.6 }}>PASSO 3</div>
            <div style={{ fontWeight: 800, marginTop: 4, fontSize: 18 }}>Acompanhar ao vivo</div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Veja a sessão em tempo real, chat do pregoeiro e deixe no automático. Pode pausar e assumir manual.</div>
            <div style={{ marginTop: 10, background: "#f59e0b", color: "#fff", display: "inline-block", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Ver agenda →</div>
          </a>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
          <b style={{ fontSize: 13 }}>O que o bot faz por lote</b>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#475569", fontSize: 13, lineHeight: 1.7 }}>
            <li><b>Piso:</b> nunca dá lance abaixo — protege sua margem</li>
            <li><b>Decremento:</b> quanto abaixa do menor lance (ex: R$ 0,50)</li>
            <li><b>Estratégias:</b> cobrir mínimo, agressivo, conservador, sniper</li>
            <li>Respeita modo ABERTO / ABERTO_FECHADO / FECHADO</li>
          </ul>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
          <b style={{ fontSize: 13 }}>Atalhos</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <a href="/editais" style={{ padding: "10px 14px", background: "#0f172a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>🔍 Buscar edital</a>
            <a href="/sessao" style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none", color: "#111", fontSize: 13, background: "#fff" }}>👁️ Sessão ao vivo</a>
            <a href="/agenda" style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none", color: "#111", fontSize: 13, background: "#fff" }}>🗓️ Agenda</a>
          </div>
        </div>
      </div>
    </main>
  );
}
