import "./globals.css";
import ConnectionDot from "./components/ConnectionDot";
export const viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body style={{ fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif", margin: 0, background: "#f8fafc", color: "#0f172a" }} suppressHydrationWarning>
        <nav style={{ background: "#0f172a", color: "#fff", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 10, overflowX: "auto" }}>
          <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 900, fontSize: 18, letterSpacing: 0.5, whiteSpace: "nowrap" }}>LicitaBOT</a>
          <span style={{ opacity: 0.5 }}>|</span>
          <a href="/editais" style={{ color: "#e2e8f0", textDecoration: "none", fontSize: 13, padding: "6px 10px", background: "#1e293b", borderRadius: 999, whiteSpace: "nowrap" }}><span style={{ background: "#2563eb", color: "#fff", borderRadius: 999, padding: "2px 6px", marginRight: 6, fontSize: 11, fontWeight: 800 }}>1</span>Buscar edital</a>
          <a href="/disputas" style={{ color: "#e2e8f0", textDecoration: "none", fontSize: 13, padding: "6px 10px", background: "#1e293b", borderRadius: 999, whiteSpace: "nowrap" }}><span style={{ background: "#16a34a", color: "#fff", borderRadius: 999, padding: "2px 6px", marginRight: 6, fontSize: 11, fontWeight: 800 }}>2</span>Configurar bot</a>
          <a href="/agenda" style={{ color: "#e2e8f0", textDecoration: "none", fontSize: 13, padding: "6px 10px", background: "#1e293b", borderRadius: 999, whiteSpace: "nowrap" }}><span style={{ background: "#f59e0b", color: "#fff", borderRadius: 999, padding: "2px 6px", marginRight: 6, fontSize: 11, fontWeight: 800 }}>3</span>Ao vivo</a>
          <a href="/empresas" style={{ color: "#e2e8f0", textDecoration: "none", fontSize: 13, padding: "6px 10px", background: "#1e293b", borderRadius: 999, whiteSpace: "nowrap" }}>🏢 Empresas</a>
          <a href="/login" style={{ color: "#fff", textDecoration: "none", fontSize: 13, padding: "6px 12px", background: "#2563eb", borderRadius: 999, whiteSpace: "nowrap", fontWeight: 800 }}>🔑 Login</a>
          <div style={{ flex: 1, minWidth: 12 }} />
          <a href="/sessao" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 12, whiteSpace: "nowrap" }}>Sessão</a>
          <span style={{ display: "inline-flex", alignItems: "center", background: "#1e293b", borderRadius: 999, padding: "5px 10px" }}><ConnectionDot size={9} /></span>
        </nav>
        {children}
        <footer style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, padding: 24 }}>SISTEMA CRIADO POR JADIEL SANTANA</footer>
      </body>
    </html>
  );
}
