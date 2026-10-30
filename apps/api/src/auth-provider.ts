import { query } from "./db";

export async function getEmpresaCredentials(cnpj: string) {
  const result = await query("SELECT portal_user, portal_pass FROM cnpj_contas WHERE cnpj = $1", [cnpj]);
  return result.rows[0] || null;
}
