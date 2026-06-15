begin;

alter table public.contract_signatures
  add column if not exists signer_signature_data_url text;

notify pgrst, 'reload schema';

commit;
