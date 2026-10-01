begin;
do $$
declare
  applicant_id uuid := '90000000-0000-0000-0000-000000000003';
  result jsonb;
  expiry timestamptz;
  membership_id uuid;
begin
  insert into auth.users(id,email) values(applicant_id,'self-service@example.test');
  perform public.register_self_service_ai(applicant_id,'Test','self-service@example.test','0912345678','健身','企劃');
  assert (select status = 'approved' and phone = '0912345678' and trial_started_at is null
    from public.ai_access_applications where user_id = applicant_id), 'registration records phone and automatic eligibility';
  assert not exists(select 1 from public.memberships where user_id = applicant_id), 'trial must wait for first login';
  assert not has_function_privilege('authenticated', 'public.start_self_service_ai_trial(uuid)', 'EXECUTE'), 'client cannot activate another user';
  result := public.start_self_service_ai_trial(applicant_id);
  expiry := (result->'membership'->>'expires_at')::timestamptz;
  membership_id := (result->'membership'->>'id')::uuid;
  assert result->'membership'->>'plan_id' = 'ai_free', 'AI-only trial';
  assert expiry - (result->'membership'->>'starts_at')::timestamptz = interval '168 hours', 'exact seven days';
  result := public.start_self_service_ai_trial(applicant_id);
  assert (result->'membership'->>'expires_at')::timestamptz = expiry, 'repeated login does not reset trial';
  assert (select count(*) = 1 from public.memberships where user_id = applicant_id), 'activation is idempotent';
  update public.memberships set expires_at = now() - interval '1 day' where id = membership_id;
  result := public.start_self_service_ai_trial(applicant_id);
  assert (result->'membership'->>'expires_at')::timestamptz < now(), 'expired trial is not restarted';
  begin
    perform public.renew_ai_application(applicant_id);
    raise exception 'Self-service renewal unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> '自助註冊試用不可重新申請，請聯絡課程顧問' then raise; end if;
  end;
  update public.memberships set status = 'cancelled' where id = membership_id;
  assert public.start_self_service_ai_trial(applicant_id)->'membership' = 'null'::jsonb, 'cancelled trial cannot be reactivated';
  delete from public.memberships where id = membership_id;
  assert public.start_self_service_ai_trial(applicant_id)->'membership' = 'null'::jsonb, 'deleted trial cannot be restarted';
  assert not exists(select 1 from public.memberships where user_id = applicant_id), 'no replacement trial';
end;
$$;
rollback;
