begin;

delete from public.ai_agents
where feature_key not in (
  'topics',
  'script',
  'material',
  'social',
  'trending',
  'planning',
  'analysis',
  'livestream',
  'chat',
  'benchmark'
);

alter table public.ai_agents
drop constraint if exists ai_agents_feature_key_check;

alter table public.ai_agents
add constraint ai_agents_feature_key_check
check (feature_key in (
  'topics',
  'script',
  'material',
  'social',
  'trending',
  'planning',
  'analysis',
  'livestream',
  'chat',
  'benchmark'
));

commit;
