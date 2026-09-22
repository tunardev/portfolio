create table if not exists games (
  id bigserial primary key,
  moves smallint[] not null,
  result text not null constraint games_result_check check (result in ('human', 'model', 'draw')),
  model_version text,
  created_at timestamptz not null default now()
);

-- not valid: checks every new row without refusing to apply over rows that predate the constraint
alter table games drop constraint if exists games_moves_check;
alter table games add constraint games_moves_check check (
  array_ndims(moves) = 1
  and cardinality(moves) between 1 and 42
  and array_position(moves, null) is null
  and 0 <= all (moves)
  and 6 >= all (moves)
) not valid;

alter table games drop constraint if exists games_model_version_check;
alter table games add constraint games_model_version_check check (char_length(model_version) <= 40) not valid;

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

-- no policies on purpose: only the server's service role key, which bypasses rls, reads or writes these
alter table games enable row level security;
alter table model_versions enable row level security;

revoke all on table games, model_versions from anon, authenticated;
revoke all on sequence games_id_seq from anon, authenticated;
