"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeHtml = decodeHtml;
exports.stripAccents = stripAccents;
exports.norm = norm;
async function decodeHtml(r) {
    const ct = r.headers.get("content-type") || "";
    const buf = await r.arrayBuffer();
    const needsLatin = ct.toLowerCase().includes("iso-8859") || ct.toLowerCase().includes("latin");
    if (needsLatin)
        return new TextDecoder("iso-8859-1").decode(buf);
    const utf = new TextDecoder("utf-8").decode(buf);
    if (utf.includes("�"))
        return new TextDecoder("iso-8859-1").decode(buf);
    return utf;
}
function stripAccents(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
//# sourceMappingURL=html.js.map