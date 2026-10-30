"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachInterceptors = attachInterceptors;
exports.sendLanceViaDOM = sendLanceViaDOM;
exports.sendLanceViaFetch = sendLanceViaFetch;
function attachInterceptors(page, opts = {}) {
    const log = opts.log ?? (() => { });
    page.on("websocket", (ws) => {
        log(`WS opened ${ws.url()}`);
        ws.on("framereceived", ({ payload }) => {
            const text = payload instanceof Buffer ? payload.toString() : String(payload);
            try {
                const data = JSON.parse(text);
                if (data.valor && data.loteId)
                    opts.onLance?.(data);
                if (data.texto || data.mensagem)
                    opts.onChat?.({ texto: data.texto ?? data.mensagem, ts: data.ts });
                if (data.serverTime || data.timestampServidor)
                    opts.onServerTime?.(data.serverTime ?? data.timestampServidor);
            }
            catch {
                if (text.includes("lance") || text.includes("LANCE"))
                    log(`WS frame ${text.slice(0, 400)}`);
            }
        });
    });
    page.on("response", async (r) => {
        const url = r.url();
        if (url.includes("/api/") || url.includes("/lances") || url.includes("/lotes")) {
            try {
                const body = await r.text();
                log(`${r.status()} ${url} ${body.slice(0, 300)}`);
                const json = JSON.parse(body);
                if (json.timestampServidor || json.serverTime)
                    opts.onServerTime?.(json.timestampServidor ?? json.serverTime);
            }
            catch { }
        }
    });
}
async function sendLanceViaDOM(page, valor) {
    const input = page.locator('input[placeholder*="lance" i], input[type="number"]').first();
    await input.click({ delay: 120 });
    await input.fill(String(valor.toFixed(2)).replace(".", ","));
    await page.keyboard.press("Tab");
    await page.locator('button:has-text("Enviar"), button:has-text("Confirmar")').first().click({ delay: 80 });
}
async function sendLanceViaFetch(page, payload) {
    return page.evaluate(async (p) => {
        const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
        const res = await fetch("/api/lances", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(p),
        });
        return { status: res.status, body: await res.text().then((t) => t.slice(0, 500)) };
    }, payload);
}
//# sourceMappingURL=intercept.js.map