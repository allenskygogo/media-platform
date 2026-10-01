-- Run after migrations in a disposable PostgreSQL database, or in a transaction.
begin;
do $$
declare
  admin_id uuid := '90000000-0000-0000-0000-000000000001';
  applicant_id uuid := '90000000-0000-0000-0000-000000000002';
  first_membership uuid;
  first_expiry timestamptz;
  result jsonb;
begin
  insert into auth.users(id,email) values(admin_id,'review-admin@example.test'),(applicant_id,'review-applicant@example.test');
  insert into public.profiles(id,display_name,email,role,status) values(admin_id,'Review Test Admin','review-admin@example.test','admin','active');
  perform public.register_ai_application(applicant_id,'Test','review-applicant@example.test','健身','企劃');
  assert (select status = 'pending' from public.ai_access_applications where user_id = applicant_id), 'registration must be pending';
  assert not exists(select 1 from public.memberships where user_id = applicant_id), 'registration must not grant membership';
  assert not has_function_privilege('authenticated', 'public.review_ai_application(uuid,uuid,text)', 'EXECUTE'), 'users cannot approve themselves';
  assert not has_function_privilege('anon', 'public.register_ai_application(uuid,text,text,text,text)', 'EXECUTE'), 'anonymous clients cannot bypass Worker';
  assert not has_table_privilege('authenticated', 'public.ai_access_applications', 'UPDATE'), 'applicants cannot rewrite status';
  begin
    perform public.review_ai_application(applicant_id, applicant_id, 'approve');
    raise exception 'Non-admin approval unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> '需要管理員權限' then raise; end if;
  end;
  result := public.review_ai_application(applicant_id, admin_id, 'approve');
  first_membership := (result->'membership'->>'id')::uuid;
  first_expiry := (result->'membership'->>'expires_at')::timestamptz;
  assert (result->'membership'->>'plan_id') = 'ai_free', 'AI only';
  assert first_expiry - (result->'membership'->>'starts_at')::timestamptz = interval '7 days', 'exact seven days';
  result := public.review_ai_application(applicant_id, admin_id, 'approve');
  assert (result->'membership'->>'id')::uuid = first_membership, 'retry must not create duplicate';
  assert (result->'membership'->>'expires_at')::timestamptz = first_expiry, 'retry must not extend deadline';
  begin
    perform public.renew_ai_application(applicant_id);
    raise exception 'Early renewal unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> '使用權限尚未到期' then raise; end if;
  end;
  update public.memberships set starts_at = now() - interval '8 days', expires_at = now() - interval '1 day' where id = first_membership;
  perform public.renew_ai_application(applicant_id);
  perform public.renew_ai_application(applicant_id);
  assert (select status = 'pending' from public.ai_access_applications where user_id = applicant_id), 'renewal needs review';
  assert (select count(*) = 1 from public.memberships where user_id = applicant_id), 'renewal alone grants nothing';
  result := public.review_ai_application(applicant_id, admin_id, 'reject');
  assert result->'application'->>'status' = 'rejected', 'reject recorded';
  assert (select count(*) = 1 from public.memberships where user_id = applicant_id), 'rejection grants nothing';
  update public.ai_access_applications set status = 'pending' where user_id = applicant_id;
  insert into public.memberships(user_id,plan_id,legacy_tier,status,starts_at,expires_at)
    values(applicant_id,'creator','standard','active',now(),now()+interval '365 days');
  begin
    perform public.review_ai_application(applicant_id, admin_id, 'approve');
    raise exception 'Course overwrite unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> '此帳號已有使用權限，請勿重複開通或覆蓋課程' then raise; end if;
  end;
end;
$$;
rollback;
