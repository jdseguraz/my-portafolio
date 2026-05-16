create extension if not exists "pgcrypto";

create table public.projects (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,
  title_en        text        not null default '',
  title_es        text        not null default '',
  subtitle_en     text        not null default '',
  subtitle_es     text        not null default '',
  description_en  text        not null default '',
  description_es  text        not null default '',
  cover_image_url text,
  gallery_images  text[]      not null default '{}',
  tags            text[]      not null default '{}',
  display_order   int         not null default 0,
  published       boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "anon read published"
  on public.projects
  for select
  to anon
  using (published = true);
