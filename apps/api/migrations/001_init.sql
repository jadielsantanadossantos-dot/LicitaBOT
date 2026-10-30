create type modo_disputa as enum ('ABERTO','ABERTO_FECHADO','FECHADO');
create type estrategia as enum ('cobrir_minimo','agressivo','conservador','sniper');
create type status_disputa as enum ('rascunho','agendada','em_andamento','encerrada');

create table if not exists cnpj_contas (
  cnpj varchar(14) primary key,
  apelido text,
  created_at timestamptz not null default now()
);

create table if not exists disputas (
  id text primary key,
  processo_id text not null,
  edital_id text,
  cnpj varchar(14) not null references cnpj_contas(cnpj) on delete cascade,
  modo modo_disputa not null,
  data_hora timestamptz not null,
  status status_disputa not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_disputas_cnpj on disputas(cnpj);
create index if not exists idx_disputas_status on disputas(status);
create index if not exists idx_disputas_data_hora on disputas(data_hora);

create table if not exists itens (
  id text primary key,
  disputa_id text not null references disputas(id) on delete cascade,
  lote_id text not null,
  descricao text,
  piso numeric(14,2) not null check (piso >= 0),
  decremento numeric(14,2) not null check (decremento > 0),
  intervalo_minimo numeric(14,2) check (intervalo_minimo is null or intervalo_minimo >= 0),
  estrategia estrategia not null,
  ativo boolean not null default true,
  unique(disputa_id, lote_id)
);
create index if not exists idx_itens_disputa on itens(disputa_id);
