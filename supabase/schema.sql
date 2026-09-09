-- Gali Den — database schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query -> Run)

create extension if not exists pgcrypto;

-- Every posted message
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(content) between 1 and 280),
  anon_id text not null,
  callsign text,
  detected_terms text[] not null default '{}',
  severity text not null default 'none', -- 'none' | 'mild' | 'severe'
  is_hidden boolean not null default false,
  report_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx on messages (created_at desc);
create index if not exists messages_anon_id_idx on messages (anon_id);
create index if not exists messages_terms_gin_idx on messages using gin (detected_terms);

-- The slang dictionary that powers detection.
-- severity: 'mild' = playful slang, counted on the leaderboards and shown live.
--           'severe' = flagged as hate speech/slurs at your discretion; matching
--           messages are hidden from the public feed and excluded from ranking.
-- Populate this yourself from the /admin page — see README for why it ships empty.
create table if not exists slang_dictionary (
  id serial primary key,
  term text unique not null,
  normalized_term text not null,
  language text not null default 'en',
  severity text not null default 'mild',
  created_at timestamptz not null default now()
);

create index if not exists slang_dict_normalized_idx on slang_dictionary (normalized_term);

-- A tiny seed list of harmless, unambiguous internet slang so the app
-- works out of the box. Add your own region-specific / Bengali / Hindi
-- terms from the /admin panel once it's deployed.
insert into slang_dictionary (term, normalized_term, language, severity) values
  ('lol', 'lol', 'en', 'mild'),
  ('lmao', 'lmao', 'en', 'mild'),
  ('bruh', 'bruh', 'en', 'mild'),
  ('sus', 'sus', 'en', 'mild'),
  ('cap', 'cap', 'en', 'mild'),
  ('no cap', 'no cap', 'en', 'mild'),
  ('salty', 'salty', 'en', 'mild'),
  ('extra', 'extra', 'en', 'mild'),
  ('fam', 'fam', 'en', 'mild'),
  ('ghosted', 'ghosted', 'en', 'mild'),
  ('vibe', 'vibe', 'en', 'mild'),
  ('vibing', 'vibing', 'en', 'mild'),
  ('mid', 'mid', 'en', 'mild'),
  ('rizz', 'rizz', 'en', 'mild'),
  ('bet', 'bet', 'en', 'mild')
on conflict (term) do nothing;

-- Reports raised via the "report" button on a message
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One row per anonymous device, used to throttle posting
create table if not exists rate_limits (
  anon_id text primary key,
  last_posted_at timestamptz,
  daily_count int not null default 0,
  daily_date date not null default current_date
);

-- Row Level Security: the browser only ever talks to Supabase directly for
-- realtime SELECT subscriptions. All writes go through the Next.js API
-- routes using the service role key, which bypasses RLS.
alter table messages enable row level security;
alter table slang_dictionary enable row level security;
alter table reports enable row level security;
alter table rate_limits enable row level security;

drop policy if exists "public read of visible messages" on messages;
create policy "public read of visible messages"
  on messages for select
  using (is_hidden = false);

-- No public insert/update/delete policies are created on purpose: the
-- anon key can only read. Writing requires the service role key, which
-- only your server-side API routes hold.
