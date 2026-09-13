create table if not exists games (
  id bigserial primary key,
  moves smallint[] not null,
  result text not null constraint games_result_check check (result in ('human', 'model', 'draw')),
  model_version text,
  created_at timestamptz not null default now()
);

create index if not exists games_created_at_idx on games (created_at);
create index if not exists games_result_created_at_idx on games (result, created_at);
create index if not exists games_model_version_idx on games (model_version);

create table if not exists model_versions (
  version text primary key,
  trained_at timestamptz not null default now(),
  games_used integer not null,
  positions integer not null,
  notes text
);

create index if not exists model_versions_trained_at_idx on model_versions (trained_at desc);

alter table games enable row level security;
alter table model_versions enable row level security;
