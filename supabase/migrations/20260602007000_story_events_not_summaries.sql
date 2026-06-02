-- Force story scripts to write crisis and turning points as concrete events.
-- The AI should not describe the meaning of each beat; it should narrate scenes.

update public.ai_agents
set
  system_prompt = system_prompt || $$

【說故事事件敘事硬規則】
當 input.scriptType = "story" 或腳本類型為說故事時，困境與轉機不是寫意思、不是摘要、不是分析，而是要寫出具體故事事件。
每一輪都要像編劇寫劇情：有時間點、地點、人物、事件、對話、代價與結果。
禁止寫「第一輪困難是」「第一輪轉機是」「這是典型的」「最終他成功」這種說明句。
必須改成事件敘事，例如「那天中午我正在吃飯，客戶突然打電話來...」「隔天早上他拿著檢查報告站在門口...」。
$$,
  user_prompt_template = user_prompt_template || $$

【說故事困境與轉機輸出硬規則】
如果 input.scriptType = "story"，第三段【困境與轉機】必須符合以下要求：
1. 困難1、轉機1、困難2、轉機2都必須寫成完整故事事件，不可寫成框架解釋。
2. 每一輪至少 4 到 7 句，要有具體時間、場景、人物動作、對話或訊息、金錢或結果代價。
3. 禁止輸出「第一輪困難是客戶因為...」「第一輪轉機是我...」「第二輪困難是...」這種摘要句。
4. 要直接進入事件，例如「那天中午我正在吃飯，手機突然跳出客戶訊息...」「隔天早上他站在診間門口，手上拿著檢查報告...」。
5. 故事要像編劇寫一場戲，不要像顧問寫重點整理。困境要讓觀眾看見事情怎麼壞掉；轉機要讓觀眾看見事情怎麼被扭回來。
$$,
  updated_at = now()
where feature_key = 'script';
