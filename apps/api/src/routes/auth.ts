import { Router } from "express";
import { z } from "zod";
import { query } from "../db";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const s = z.object({ cnpj: z.string().min(14) });
    const b = s.parse(req.body);
    const cnpj = String(b.cnpj).replace(/\D/g, "");
    if (!cnpj) return res.status(400).json({ ok: false, error: "cnpj obrigatório" });
    const r = await query("select cnpj, apelido, razao_social from cnpj_contas where cnpj=$1", [cnpj]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: "Empresa não cadastrada. Cadastre em /empresas" });
    const row = r.rows[0] as any;
    return res.json({ ok: true, cnpj, nome: row.razao_social || row.apelido || cnpj, apelido: row.apelido ?? null });
  } catch (e) { next(e); }
});

router.get("/me", async (req, res, next) => {
  try {
    const cnpj = String((req.query as any).cnpj ?? "").replace(/\D/g, "");
    if (!cnpj) return res.status(400).json({ error: "cnpj obrigatório" });
    const r = await query("select cnpj, apelido, razao_social from cnpj_contas where cnpj=$1", [cnpj]);
    if (!r.rows.length) return res.status(404).json({ error: "Empresa não encontrada" });
    res.json({ ok: true, ...r.rows[0] });
  } catch (e) { next(e); }
});

export default router;
