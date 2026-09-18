begin;

create table public.ai_access_applications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  industry text not null check (char_length(industry) between 1 and 100),
  purpose text not null check (char_length(purpose) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  membership_id uuid references public.memberships(id) on delete set null
);
alter table public.ai_access_applications enable row level security;
revoke all on public.ai_access_applications from anon, authenticated;
grant select on public.ai_access_applications to authenticated;
grant all on public.ai_access_applications to service_role;
create policy ai_application_read_own on public.ai_access_applications
  for select to authenticated using (user_id = auth.uid());

-- Only the Worker service role can create applications or review them.
create function public.register_ai_application(p_user_id uuid, p_name text, p_email text, p_industry text, p_purpose text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from memberships where user_id = p_user_id) then
    raise exception '帳號已存在，請直接登入';
  end if;
  insert into profiles(id, display_name, email, role, status)
    values (p_user_id, p_name, p_email, 'student', 'active')
    on conflict (id) do nothing;
  if not exists (select 1 from profiles where id = p_user_id and role = 'student' and email = p_email) then
    raise exception '帳號資料不符';
  end if;
  insert into ai_access_applications(user_id, industry, purpose)
    values(p_user_id, p_industry, p_purpose);
end;
$$;

create function public.review_ai_application(p_user_id uuid, p_admin_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  application ai_access_applications%rowtype;
  membership memberships%rowtype;
  approved_at timestamptz := clock_timestamp();
begin
  if not exists(select 1 from profiles where id = p_admin_id and role = 'admin' and status = 'active') then
    raise exception '需要管理員權限';
  end if;
  -- Serializes retries and simultaneous reviews of the same application.
  perform 1 from profiles where id = p_user_id and role = 'student' and status = 'active' for update;
  if not found then raise exception '帳號未啟用'; end if;
  select * into application from ai_access_applications where user_id = p_user_id for update;
  if not found then raise exception '找不到申請'; end if;
  if p_action not in ('approve', 'reject') then raise exception '無效的審核操作'; end if;
  select * into membership from memberships where user_id = p_user_id and status = 'active' order by starts_at desc limit 1;
  if membership.id is not null and (membership.expires_at is null or membership.expires_at > approved_at) then
    if application.status = 'approved' and application.membership_id = membership.id and p_action = 'approve' then
      return jsonb_build_object('application', to_jsonb(application), 'membership', to_jsonb(membership));
    end if;
    raise exception '此帳號已有使用權限，請勿重複開通或覆蓋課程';
  end if;
  if application.status <> 'pending' then raise exception '此申請已審核，請重新整理'; end if;
  if p_action = 'approve' then
    insert into memberships(user_id, plan_id, legacy_tier, status, starts_at, expires_at)
      values(p_user_id, 'ai_free', 'ai_free', 'active', approved_at, approved_at + interval '7 days') returning * into membership;
  end if;
  update ai_access_applications set
    status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    reviewed_at = approved_at, reviewed_by = p_admin_id,
    membership_id = case when p_action = 'approve' then membership.id else membership_id end
    where user_id = p_user_id returning * into application;
  return jsonb_build_object('application', to_jsonb(application), 'membership', to_jsonb(membership));
end;
$$;

create function public.renew_ai_application(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare application ai_access_applications%rowtype;
begin
  perform 1 from profiles where id = p_user_id and role = 'student' and status = 'active' for update;
  if not found then raise exception '帳號未啟用'; end if;
  select * into application from ai_access_applications where user_id = p_user_id for update;
  if not found then raise exception '找不到申請'; end if;
  if application.status = 'pending' then return; end if;
  if application.status = 'rejected' then raise exception '申請未通過，請聯絡課程顧問'; end if;
  if exists(select 1 from memberships where user_id = p_user_id and status = 'active' and (expires_at is null or expires_at > now())) then
    raise exception '使用權限尚未到期';
  end if;
  update ai_access_applications set status = 'pending', submitted_at = now(), reviewed_at = null, reviewed_by = null where user_id = p_user_id;
end;
$$;
revoke all on function public.register_ai_application(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.review_ai_application(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.renew_ai_application(uuid) from public, anon, authenticated;
grant execute on function public.register_ai_application(uuid,text,text,text,text) to service_role;
grant execute on function public.review_ai_application(uuid,uuid,text) to service_role;
grant execute on function public.renew_ai_application(uuid) to service_role;
commit;
