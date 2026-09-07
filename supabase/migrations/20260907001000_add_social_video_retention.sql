begin;

alter table public.social_videos
  add column if not exists storage_provider text not null default 'pending'
    check (storage_provider in ('pending', 'cloudflare_stream', 'cloudflare_r2', 'external')),
  add column if not exists stream_uid text,
  add column if not exists upload_status text not null default 'pending'
    check (upload_status in ('pending', 'uploading', 'ready', 'failed', 'deleted')),
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists delete_after timestamptz,
  add column if not exists cleanup_status text not null default 'active'
    check (cleanup_status in ('active', 'scheduled', 'deleted', 'failed')),
  add column if not exists cleanup_error text;

create index if not exists social_videos_cleanup_idx
  on public.social_videos(cleanup_status, expires_at);

create index if not exists social_videos_stream_uid_idx
  on public.social_videos(stream_uid)
  where stream_uid is not null;

notify pgrst, 'reload schema';

commit;
