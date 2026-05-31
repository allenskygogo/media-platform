begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  name text not null,
  description text,
  system_prompt text not null,
  user_prompt_template text not null,
  output_schema jsonb not null default '{}'::jsonb,
  model text not null default 'gpt-4.1-mini',
  temperature numeric not null default 0.85,
  vector_store_id text,
  required_plan text not null default 'trial',
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_agents_feature_key_check
    check (feature_key in (
      'topics',
      'script',
      'shooting',
      'planning',
      'marketing',
      'livestream',
      'account',
      'analysis',
      'social',
      'benchmark',
      'material',
      'trending',
      'chat'
    )),
  constraint ai_agents_required_plan_check
    check (required_plan in ('trial', 'creator', 'master', 'managed')),
  constraint ai_agents_temperature_check
    check (temperature >= 0 and temperature <= 2)
);

drop trigger if exists set_ai_agents_updated_at
  on public.ai_agents;

create trigger set_ai_agents_updated_at
before update on public.ai_agents
for each row
execute function public.set_updated_at();

alter table public.ai_agents enable row level security;

drop policy if exists "Admins can read ai agents"
  on public.ai_agents;

drop policy if exists "Admins can manage ai agents"
  on public.ai_agents;

create policy "Admins can read ai agents"
on public.ai_agents
for select
to authenticated
using (public.is_admin());

create policy "Admins can manage ai agents"
on public.ai_agents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.ai_agents to authenticated;

insert into public.ai_agents (
  feature_key,
  name,
  description,
  system_prompt,
  user_prompt_template,
  output_schema,
  model,
  temperature,
  required_plan,
  enabled,
  notes
) values (
  'topics',
  '爆款選題 Agent',
  '根據使用者輸入的產業、主題或內容方向，產生 8 個符合 TOP LEVEL TRAFFIC 爆款元素模型的短影音選題。',
  '你是 TOP LEVEL TRAFFIC 的爆款選題智能體。你專門協助自媒體創作者從產業、受眾、痛點、產品服務與流量角度中，設計可拍攝、可引發好奇心、具備短影音標題感的爆款選題。請使用繁體中文，語氣專業、具體、直接。你的輸出必須符合指定 JSON schema，不要輸出 Markdown，不要使用 emoji，不要加入 JSON 以外的文字。',
  '請根據以下輸入產生 8 個爆款短影音選題。

使用者輸入：
{{input}}

使用者方案：
{{userPlan}}

輸出要求：
- 必須回傳 JSON array
- 必須剛好 8 筆
- 8 筆元素依序為：奇葩、人群、懷舊、最差、頭牌、荷爾蒙、反差、成本
- 每一筆格式：
  {
    "element": "奇葩|人群|懷舊|最差|頭牌|荷爾蒙|反差|成本",
    "text": "不含元素括號的選題文字",
    "traffic": "high|medium|low"
  }
- 選題要有短影音標題感，可直接拿去拍
- 選題要具體，避免空泛口號
- 不要使用 emoji
- 不要輸出 JSON 以外的文字',
  '{
    "type": "array",
    "minItems": 8,
    "maxItems": 8,
    "items": {
      "type": "object",
      "required": ["element", "text", "traffic"],
      "properties": {
        "element": {
          "type": "string",
          "enum": ["奇葩", "人群", "懷舊", "最差", "頭牌", "荷爾蒙", "反差", "成本"]
        },
        "text": {
          "type": "string"
        },
        "traffic": {
          "type": "string",
          "enum": ["high", "medium", "low"]
        }
      }
    }
  }'::jsonb,
  'gpt-4.1-mini',
  0.85,
  'trial',
  true,
  '第一階段先將爆款選題 GPTs 邏輯轉成 API Agent。未來可把 system_prompt / user_prompt_template 換成正式 GPTs 指令。'
)
on conflict (feature_key) do update
set
  name = excluded.name,
  description = excluded.description,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  output_schema = excluded.output_schema,
  model = excluded.model,
  temperature = excluded.temperature,
  required_plan = excluded.required_plan,
  enabled = excluded.enabled,
  notes = excluded.notes,
  updated_at = now();

commit;
