-- void: answers table + row level security + seed data
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It is safe to run more than once: every statement is idempotent.

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  status text not null default 'approved',
  rejection_reason text,
  source text not null default 'user',
  created_at timestamptz not null default now(),
  submitter_ip_hash text
);

-- Constrain the two enum-ish columns. Named so re-running is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'answers_status_check'
  ) then
    alter table public.answers
      add constraint answers_status_check
      check (status in ('approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'answers_source_check'
  ) then
    alter table public.answers
      add constraint answers_source_check
      check (source in ('seed', 'user'));
  end if;
end
$$;

-- The frontend only ever reads `where status = 'approved'`, and the edge
-- function counts recent rows by submitter_ip_hash.
create index if not exists answers_status_idx on public.answers (status);
create index if not exists answers_ip_hash_created_at_idx
  on public.answers (submitter_ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- anon (the key that ships in the browser bundle) can SELECT approved rows and
-- nothing else. There is deliberately no insert/update/delete policy, so those
-- are denied for anon and authenticated. All writes go through the
-- submit-answer edge function, which uses the service role key and bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.answers enable row level security;

drop policy if exists "Anyone can read approved answers" on public.answers;
create policy "Anyone can read approved answers"
  on public.answers
  for select
  to anon, authenticated
  using (status = 'approved');

-- Be explicit about grants rather than relying on Supabase defaults.
grant usage on schema public to anon, authenticated;
grant select on public.answers to anon, authenticated;
revoke insert, update, delete on public.answers from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the standard 20 magic 8 ball responses
-- ---------------------------------------------------------------------------

insert into public.answers (text, status, source)
select v.text, 'approved', 'seed'
from (
  values
    ('It is certain'),
    ('It is decidedly so'),
    ('Without a doubt'),
    ('Yes definitely'),
    ('You may rely on it'),
    ('As I see it, yes'),
    ('Most likely'),
    ('Outlook good'),
    ('Yes'),
    ('Signs point to yes'),
    ('Reply hazy, try again'),
    ('Ask again later'),
    ('Better not tell you now'),
    ('Cannot predict now'),
    ('Concentrate and ask again'),
    ('Do not count on it'),
    ('My reply is no'),
    ('My sources say no'),
    ('Outlook not so good'),
    ('Very doubtful')
) as v(text)
where not exists (
  select 1
  from public.answers a
  where a.text = v.text
    and a.source = 'seed'
);
