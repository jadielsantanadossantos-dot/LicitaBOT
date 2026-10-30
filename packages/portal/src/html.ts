export async function decodeHtml(r: Response): Promise<string>{
  const ct = r.headers.get("content-type")||"";
  const buf = await r.arrayBuffer();
  const needsLatin = ct.toLowerCase().includes("iso-8859") || ct.toLowerCase().includes("latin");
  if(needsLatin) return new TextDecoder("iso-8859-1").decode(buf);
  const utf = new TextDecoder("utf-8").decode(buf);
  if(utf.includes("�")) return new TextDecoder("iso-8859-1").decode(buf);
  return utf;
}
export function stripAccents(s:string){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
export function norm(s:string){ return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
