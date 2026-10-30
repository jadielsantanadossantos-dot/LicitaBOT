alter table cnpj_contas add column if not exists razao_social text;
alter table cnpj_contas add column if not exists portal_user text;
alter table cnpj_contas add column if not exists portal_pass text;
alter table cnpj_contas add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_cnpj_updated on cnpj_contas;
create trigger trg_cnpj_updated before update on cnpj_contas for each row execute function set_updated_at();
