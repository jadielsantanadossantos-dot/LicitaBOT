"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
type S = "connecting" | "connected" | "disconnected";
export default function ConnectionDot({ size = 10, showLabel = true }: { size?: number; showLabel?: boolean }) {
  const [s, setS] = useState<S>("connecting");
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        setS((p) => (p === "connected" ? p : "connecting"));
        const r = await fetch(`${API}/health`, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (!alive) return;
        setS(j?.ok ? "connected" : "disconnected");
      } catch {
        if (alive) setS("disconnected");
      }
    }
    check();
    const t = setInterval(check, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const color = s === "connected" ? "#22c55e" : s === "connecting" ? "#eab308" : "#ef4444";
  const label = s === "connected" ? "Conectado" : s === "connecting" ? "Conectando" : "Desconectado";
  return (
    <span title={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#e2e8f0" }}>
      <span style={{ width: size, height: size, borderRadius: 999, background: color, display: "inline-block", boxShadow: s === "connected" ? `0 0 0 4px rgba(34,197,94,0.25)` : s === "connecting" ? `0 0 0 4px rgba(234,179,8,0.25)` : `0 0 0 4px rgba(239,68,68,0.2)`, animation: s === "connecting" ? "pulse 1.2s infinite" : undefined }} />
      {showLabel && <span style={{ fontWeight: 700, color: s === "disconnected" ? "#fecaca" : s === "connecting" ? "#fef08a" : "#bbf7d0" }}>{label}</span>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
    </span>
  );
}
