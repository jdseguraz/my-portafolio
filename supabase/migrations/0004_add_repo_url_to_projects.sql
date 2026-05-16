-- Adds an optional source-code repository URL field to projects.
-- Rendered as a GitHub icon on the gallery card and a "View source" button on
-- the project detail page, only when present. Lives alongside live_url so each
-- project can have either, both, or neither.
alter table public.projects
  add column repo_url text;
