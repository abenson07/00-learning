-- learn-006: content version supersession chain (optional FK for tooling / future use)

alter table public.content_version
  add column supersedes_version_id uuid references public.content_version (id) on delete set null;

create index content_version_supersedes_version_id_idx
  on public.content_version (supersedes_version_id);
