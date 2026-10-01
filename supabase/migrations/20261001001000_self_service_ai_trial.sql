begin;

alter table public.ai_access_applications
  add column phone text check (phone ~ '^09[0-9]{8}$'),
  add column registration_mode text not null default 'manual'
    check (registration_mode in ('manual', 'self_service')),
  add column trial_started_at timestamptz;

create function public.register_self_service_ai(
  p_user_id uuid, p_name text, p_email text, p_phone text, p_industry text, p_purpose text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_phone is null or p_phone !~ '^09[0-9]{8}$' then
    raise exception '請填寫有效台灣手機號碼';
  end if;
  perform public.register_ai_application(p_user_id, p_name, p_email, p_industry, p_purpose);
  update ai_access_applications set phone = p_phone, registration_mode = 'self_service',
    status = 'approved' where user_id = p_user_id;
end;
$$;

create function public.start_self_service_ai_trial(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  application ai_access_applications%rowtype;
  membership memberships%rowtype;
  started_at timestamptz;
begin
  perform 1 from profiles where id = p_user_id and role = 'student' and status = 'active' for update;
  if not found then raise exception '帳號未啟用'; end if;
  select * into application from ai_access_applications where user_id = p_user_id for update;
  if not found or application.registration_mode <> 'self_service' or application.status <> 'approved' then
    return jsonb_build_object('membership', null);
  end if;
  if application.trial_started_at is not null then
    select * into membership from memberships where id = application.membership_id and user_id = p_user_id and status = 'active';
    if not found then return jsonb_build_object('membership', null); end if;
    return jsonb_build_object('membership', to_jsonb(membership));
  end if;
  -- Never replace or extend an existing course or AI membership.
  if exists(select 1 from memberships where user_id = p_user_id) then
    return jsonb_build_object('membership', null);
  end if;
  started_at := clock_timestamp();
  insert into memberships(user_id, plan_id, legacy_tier, status, starts_at, expires_at)
    values(p_user_id, 'ai_free', 'ai_free', 'active', started_at, started_at + interval '168 hours')
    returning * into membership;
  update ai_access_applications set trial_started_at = started_at, membership_id = membership.id
    where user_id = p_user_id;
  return jsonb_build_object('membership', to_jsonb(membership));
end;
$$;

-- Self-service signup grants one trial; the existing reviewed renewal flow remains
-- available only for legacy manual applications.
create function public.protect_self_service_trial_renewal()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.registration_mode = 'self_service' and new.status <> old.status then
    raise exception '自助註冊試用不可重新申請，請聯絡課程顧問';
  end if;
  return new;
end;
$$;
create trigger protect_self_service_trial_renewal
  before update of status on public.ai_access_applications
  for each row execute function public.protect_self_service_trial_renewal();

revoke all on function public.register_self_service_ai(uuid,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.start_self_service_ai_trial(uuid) from public, anon, authenticated;
grant execute on function public.register_self_service_ai(uuid,text,text,text,text,text) to service_role;
grant execute on function public.start_self_service_ai_trial(uuid) to service_role;
commit;
