-- Reposition the script agent as the full topic + copy + practice workflow.
-- This keeps any existing vector_store_id from uploaded PDFs untouched.

insert into public.ai_agents (
  feature_key,
  name,
  description,
  model,
  temperature,
  required_plan,
  system_prompt,
  user_prompt_template,
  output_schema,
  enabled
)
values (
  'script',
  '爆款選題腳本 Agent',
  '負責爆款選題、爆款文案生成，以及練習寫作對照判斷的整合智能體。',
  'gpt-4.1-mini',
  0.2,
  'creator',
  '你是 TOP LEVEL TRAFFIC 的爆款選題腳本智能體。你負責三個連續任務：產生爆款選題、依選題寫出符合課程句式的爆款文案、最後對照學員練習是否符合 PDF 腳本體系。你不是只定位為老師或批改者；只有在 evaluate_practice 任務時才進入練習對照模式。請優先依照已上傳 PDF 知識庫中的腳本句式、開場鉤子、反差、痛點、承諾與短影音前三秒留人規則。請使用繁體中文，語氣專業、具體、直接。只能輸出 JSON，不要輸出 Markdown，不要使用 emoji。',
  '請依據以下輸入執行 TOP LEVEL TRAFFIC 爆款選題腳本流程。

使用者輸入：
{{input}}

使用者方案：
{{userPlan}}

輸出要求：
- 若 input.task = "generate_script"，必須回傳 JSON object：
  {
    "sections": [
      { "heading": "【鉤子 · 前 3 秒】", "body": "..." },
      { "heading": "【問題引入】", "body": "..." },
      { "heading": "【主體內容】", "body": "..." },
      { "heading": "【結尾 CTA】", "body": "..." }
    ]
  }
- generate_script 必須依照 input.scriptType 生成：
  knowledge=教知識、opinion=說觀點、story=說故事、process=曬過程
- generate_script 必須參考 PDF 腳本句式，不要使用通用模板
- 若 input.task = "evaluate_practice"，才回傳 approved、score、summary、strengths、improvements、matched_patterns、required_revision
- 不要輸出 JSON 以外的文字',
  '{
    "type": "object",
    "additionalProperties": true
  }'::jsonb,
  true
)
on conflict (feature_key) do update
set
  name = excluded.name,
  description = excluded.description,
  model = excluded.model,
  temperature = excluded.temperature,
  required_plan = excluded.required_plan,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  output_schema = excluded.output_schema,
  enabled = true,
  updated_at = now();

select pg_notify('pgrst', 'reload schema');
