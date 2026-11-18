create table if not exists public.canvas_documents (
  id uuid primary key,
  name text not null,
  storage_path text not null,
  storage_bucket text not null default 'canvas-originals',
  document jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canvas_documents enable row level security;

-- Prototype only: these policies allow any anonymous client to read and edit every document.
create policy "prototype can read canvas documents"
  on public.canvas_documents for select to anon, authenticated using (true);
create policy "prototype can create canvas documents"
  on public.canvas_documents for insert to anon, authenticated with check (true);
create policy "prototype can update canvas documents"
  on public.canvas_documents for update to anon, authenticated using (true) with check (true);
grant select, insert, update on public.canvas_documents to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('canvas-originals', 'canvas-originals', true, 31457280)
on conflict (id) do update set public = excluded.public;

create policy "prototype can read canvas assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'canvas-originals');
create policy "prototype can upload canvas assets"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'canvas-originals');
create policy "prototype can replace canvas assets"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'canvas-originals') with check (bucket_id = 'canvas-originals');

create or replace function public.save_canvas_document(
  p_id uuid,
  p_document jsonb,
  p_expected_version integer
)
returns setof public.canvas_documents
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
    update public.canvas_documents
    set document = p_document,
        version = version + 1,
        updated_at = now()
    where id = p_id and version = p_expected_version
    returning *;

  if not found then
    if exists (select 1 from public.canvas_documents where id = p_id) then
      raise exception 'canvas_document_version_conflict' using errcode = '40001';
    end if;
    raise exception 'canvas_document_not_found' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.save_canvas_document(uuid, jsonb, integer) to anon, authenticated;