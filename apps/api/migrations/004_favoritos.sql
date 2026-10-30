create table if not exists edital_favoritos (
  id text primary key,
  numero text,
  objeto text,
  orgao text,
  uf text,
  municipio text,
  data_abertura text,
  modo text,
  url text,
  edital_json jsonb,
  created_at timestamptz not null default now()
);
