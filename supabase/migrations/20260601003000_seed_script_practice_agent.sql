begin;

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
  'script',
  '爆款選題腳本 Agent',
  '負責判斷學員針對爆款選題寫出的開場白與腳本練習，是否符合 TOP LEVEL TRAFFIC 課程 PDF 內的句式、鉤子與腳本結構。',
  '你是 TOP LEVEL TRAFFIC 的腳本練習評分老師。你必須優先依照已上傳的 PDF 知識庫、課程腳本句式、開場鉤子、反差、痛點、承諾與短影音前三秒留人規則來判斷學員練習。你的任務不是幫學員重寫完整文案，而是判斷是否符合課程句式，並給出具體可修改方向。請使用繁體中文，語氣專業、具體、直接。只能輸出 JSON，不要輸出 Markdown，不要使用 emoji。',
  '請判斷以下學員練習是否符合 TOP LEVEL TRAFFIC 腳本句式。

使用者輸入：
{{input}}

使用者方案：
{{userPlan}}

判斷標準：
- 必須參考 PDF 知識庫中的腳本句式、開場公式與課程規則
- 不是只看字數
- 需要有明確受眾、痛點、反差或好奇鉤子
- 需要讓觀眾前三秒願意繼續看
- 需要符合該腳本類型的表達方式
- 75 分以上才算通過

輸出要求：
- 必須回傳 JSON object
- 不要輸出 JSON 以外的文字
- 格式：
{
  "approved": true 或 false,
  "score": 0 到 100 的數字,
  "summary": "一句話總評",
  "strengths": ["做得好的地方"],
  "improvements": ["需要修改的地方"],
  "matched_patterns": ["符合的 PDF/課程句式重點"],
  "required_revision": "如果未通過，給一段具體修改方向；通過則填空字串"
}',
  '{
    "type": "object",
    "required": ["approved", "score", "summary", "strengths", "improvements", "matched_patterns", "required_revision"],
    "properties": {
      "approved": { "type": "boolean" },
      "score": { "type": "number", "minimum": 0, "maximum": 100 },
      "summary": { "type": "string" },
      "strengths": {
        "type": "array",
        "items": { "type": "string" }
      },
      "improvements": {
        "type": "array",
        "items": { "type": "string" }
      },
      "matched_patterns": {
        "type": "array",
        "items": { "type": "string" }
      },
      "required_revision": { "type": "string" }
    }
  }'::jsonb,
  'gpt-4.1-mini',
  0.2,
  'creator',
  true,
  '請把腳本句式、開場公式、練習規則等 PDF 上傳到此 Agent。前台爆款選題腳本的練習寫作判斷會讀取這個 Agent 的知識庫。'
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

select pg_notify('pgrst', 'reload schema');

commit;
