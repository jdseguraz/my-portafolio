-- Adds an optional production URL field to projects.
-- Rendered as an external-link icon on the gallery card and a "Visit site"
-- button on the project detail page, only when present.
alter table public.projects
  add column live_url text;
