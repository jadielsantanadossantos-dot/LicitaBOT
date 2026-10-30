"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarDisputa = validarDisputa;
exports.validarCNPJ = validarCNPJ;
function validarDisputa(d) {
    const e = [];
    if (!d.cnpj)
        e.push("cnpj obrigatório");
    if (!d.processoId)
        e.push("processoId obrigatório");
    if (!d.modo)
        e.push("modo obrigatório");
    if (!d.dataHora)
        e.push("dataHora obrigatória");
    if (!d.itens?.length)
        e.push("ao menos 1 item");
    if (d.exequibilidade != null && (!Number.isFinite(d.exequibilidade) || d.exequibilidade < 10 || d.exequibilidade > 100))
        e.push("exequibilidade deve ser 10..100 (%)");
    d.itens?.forEach((it, i) => {
        if (it.piso != null && it.piso < 0)
            e.push(`itens[${i}].piso inválido`);
        if (it.decremento == null || it.decremento <= 0)
            e.push(`itens[${i}].decremento deve ser >0`);
        if (it.intervaloMinimo != null && it.intervaloMinimo < 0)
            e.push(`itens[${i}].intervaloMinimo inválido`);
        if (it.piso != null && it.decremento != null && it.decremento > it.piso)
            e.push(`itens[${i}].decremento não pode exceder piso`);
        const pa = it.posicaoAlvo;
        if (pa == null || !Number.isInteger(pa) || pa < 1 || pa > 10)
            e.push(`itens[${i}].posicaoAlvo deve ser 1..10`);
    });
    const cnpjs = new Set(d.itens?.map((x) => x.loteId));
    if (cnpjs.size !== d.itens?.length)
        e.push("loteId duplicado entre itens");
    return e;
}
function validarCNPJ(cnpj) {
    const n = cnpj.replace(/\D/g, "");
    if (n.length !== 14 || /^(\d)\1{13}$/.test(n))
        return false;
    const calc = (base, pesos) => {
        let s = 0;
        for (let i = 0; i < base.length; i++)
            s += parseInt(base[i], 10) * pesos[i];
        const r = s % 11;
        return r < 2 ? 0 : 11 - r;
    };
    const b12 = n.slice(0, 12);
    const d13 = calc(b12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d14 = calc(b12 + String(d13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return n === b12 + String(d13) + String(d14);
}
//# sourceMappingURL=index.js.map