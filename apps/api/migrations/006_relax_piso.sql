-- Realidade do Supabase: itens.piso é nullable (517/517 nulos no pregão 508293).
-- O app já modela piso como number|null (shared ItemConfig) e a Fase 3 calcula
-- piso automático via exequibilidade x referência quando piso é null.
alter table itens alter column piso drop not null;
