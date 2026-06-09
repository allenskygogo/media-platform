/**
 * Cloudflare Worker — Media Platform API
 *
 * Required Worker Secrets (set via `wrangler secret put` or the dashboard):
 *   CLOUDFLARE_ACCOUNT_ID       — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN        — API token with Stream:Edit permission
 *   CLOUDFLARE_STREAM_KEY_ID    — signing key ID from Stream dashboard
 *   CLOUDFLARE_STREAM_SIGNING_KEY — PEM private key (PKCS#8, BEGIN PRIVATE KEY)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — Google service account email for Calendar
 *   GOOGLE_PRIVATE_KEY            — Google service account private key
 *   GOOGLE_CALENDAR_ID            — Google Calendar ID to check availability
 *   SUPABASE_URL                  — Supabase project URL for admin verification
 *   SUPABASE_ANON_KEY             — Supabase anon key for admin verification
 *   SUPABASE_SERVICE_ROLE_KEY     — optional server-only key for private AI agent prompts
 *   OPENAI_API_KEY                — OpenAI API key for server-side AI generation
 *   OPENAI_MODEL                  — optional model override for AI generation
 *   NEWEBPAY_MERCHANT_ID          — NewebPay merchant ID
 *   NEWEBPAY_HASH_KEY             — NewebPay HashKey
 *   NEWEBPAY_HASH_IV              — NewebPay HashIV
 *   NEWEBPAY_ENV                  — stage or production
 *   PUBLIC_APP_URL                — public frontend base URL
 *   WORKER_PUBLIC_URL             — public Worker base URL for payment callback URLs
 */

const CF_BASE = 'https://api.cloudflare.com/client/v4/accounts'
const AI_KNOWLEDGE_BUCKET = 'ai-knowledge'
const BOOKING_TIME_SLOTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const DEFAULT_BOOKING_DURATION_MINUTES = 180
const TAIPEI_OFFSET = '+08:00'
const PLAN_TO_LEGACY_TIER = {
  trial: 'basic',
  creator: 'standard',
  master: 'advanced',
  managed: 'managed',
}
const PLAN_DURATION_DAYS = {
  trial: 90,
  creator: 365,
  master: 365,
  managed: null,
}
const PLAN_AMOUNT = {
  trial: 980,
  creator: 39800,
  master: 129800,
}
const ECPAY_STAGE_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
const ECPAY_PROD_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
const NEWEBPAY_STAGE_URL = 'https://ccore.newebpay.com/MPG/mpg_gateway'
const NEWEBPAY_PROD_URL = 'https://core.newebpay.com/MPG/mpg_gateway'
const NEWEBPAY_VERSION = '2.0'
const DEFAULT_AI_AGENTS = {
  topics: {
    feature_key: 'topics',
    name: '爆款選題 Agent',
    model: 'gpt-4.1-mini',
    temperature: 0.85,
    system_prompt: '你是 TOP LEVEL TRAFFIC 的爆款選題智能體。你專門協助自媒體創作者從產業、受眾、痛點、人物關係、衝突事件、產品服務與流量角度中，設計可拍攝、可引發好奇心、具備短影音標題感的爆款選題。當 input.scriptType = "opinion" 或腳本類型為說觀點時，必須使用「寫作對象 TA → 人物關係 → 衝突事件 → 明確觀點句」的選題邏輯。說觀點選題不是知識解析，也不是泛泛評論；它要讓特定受眾感覺你站在他那邊、把他不敢講的話講出來。當 input.scriptType = "story" 或腳本類型為說故事時，選題一定要圍繞自己達成的成就、你幫別人達成的成就，或你用價值觀解決的衝突事件；不能產生知識解析、技巧清單、普通觀點或泛泛經驗談。說故事選題必須能自然接出困境與轉機。請使用繁體中文，語氣具體、直接、白話。你的輸出必須符合指定 JSON schema，不要輸出 Markdown，不要使用 emoji，不要加入 JSON 以外的文字。',
    user_prompt_template: `請根據以下輸入產生 8 個爆款短影音選題。

使用者輸入：
{{input}}

使用者方案：
{{userPlan}}

輸出要求：
- 必須回傳 JSON array
- 必須剛好 8 筆
- 若不是曬過程，8 筆元素依序為：奇葩、人群、懷舊、最差、頭牌、荷爾蒙、反差、成本
- 若 input.scriptType = "process"，8 筆元素依序為：過程展示、測評產品、任務挑戰、事件體驗、過程展示、測評產品、任務挑戰、事件體驗
- 每一筆格式：
  {
    "element": "奇葩|人群|懷舊|最差|頭牌|荷爾蒙|反差|成本|過程展示|測評產品|任務挑戰|事件體驗",
    "text": "不含元素括號的選題文字",
    "traffic": "high|medium|low"
  }
- 選題要有短影音標題感，可直接拿去拍
- 選題要具體，避免空泛口號
- 如果 input.scriptType = "opinion"，請嚴格依照以下流程產生選題：
  1. 先判斷這支內容要寫給誰看，也就是 TA，例如媽媽、上班族、餐飲老闆、健身新手、美業創業者。
  2. 再找 TA 最常發生衝突的人物關係，例如公婆、老公、小孩、老師、其他媽媽、主管、客人、員工、同行。
  3. 再找他們最常吵架或卡住的具體衝突事件，例如小孩教育、生活習慣、帶小孩方式、要不要同住、對方不站出來、家務分工、薪水不公平、客人亂殺價、員工不配合。
  4. 最後輸出「明確觀點句」，優先使用否定句或強立場句，不要輸出普通分析題。
- 說觀點選題公式：
  我要寫給【TA】看；TA 最常跟【人物關係】發生衝突；他們最常因為【衝突事件】吵架；所以選題必須是【明確觀點句】。
- 說觀點開篇強度排序：否定句 > 肯定句 > 疑問句。請優先用否定句。
- 說觀點選題模板可使用：
  - 千萬不要 + 行為
  - 建議你不要 + 行為
  - 真正懂的人，不會 + 行為
  - 如果你是【身份】，一定不要 + 行為
  - 【身份】最容易吃虧的，就是 + 錯誤行為
  - 很多人以為【常識】，但其實【反常識觀點】
- 說觀點選題必須自然合理，不要牽強硬套。人物關係、衝突事件、觀點句三者必須能連在一起。
- 說觀點選題範例：
  - 要生小孩的爸爸媽媽，絕對不要跟公婆住在一起
  - 如果你有兩個小孩，又要自己帶小孩，千萬不要跟婆婆住在一起
  - 千萬不要買公寓
  - 憑什麼結婚之後過年必須回公婆家
- 如果 input.scriptType = "story"，請嚴格依照以下流程產生選題：
  1. 先判斷素材屬於哪一種故事：小有成就、成功案例、平凡英雄。
  2. 小有成就選題必須是「我達成了什麼成果」加上一個阻礙或代價，不可只寫心得。
  3. 成功案例選題必須是「我幫別人達成什麼成果」，並且能看出你介入幫助與對方努力。
  4. 平凡英雄選題必須是「我遇到或看見什麼衝突」，以及你用價值觀做了什麼行動。
  5. 每個選題都要能接出至少一輪困境與轉機，最好能接出兩輪：困難1、轉機1、困難2、轉機2。
- 說故事選題模板可使用：
  - 沒想到我一個【身份】，靠【事情】做到【成果】，只不過【阻礙】
  - 我幫一個【對象】，從【低點】做到【成果】，中間差點卡在【困境】
  - 那天我遇到【不公平事件】，我沒有選擇【常見反應】，而是【行動】
  - 做【主題】最狼狽的那一年，我以為自己快撐不下去了
- 說故事禁止輸出：
  - 如何做好【主題】
  - 【主題】技巧解析
  - 【主題】方法教學
  - 我對【主題】的一個看法
  - 沒有明確主角、成果、衝突、困境或轉機的題目
- 如果 input.scriptType = "process"，請嚴格依照曬過程選題邏輯產生選題：
  1. 曬過程只有四個腳本方向：過程展示、測評產品、任務挑戰、事件體驗。
  2. 8 個選題必須四種方向各至少 2 題，元素欄位請直接填「過程展示」「測評產品」「任務挑戰」「事件體驗」，不要使用奇葩、人群、懷舊、最差、頭牌、荷爾蒙、反差、成本。
  3. 過程展示：拍進貨、諮詢、服務、售後、接需求到交付、從想法到成品等完整流程。
  4. 測評產品：拍對比測評、極限測評、化驗測評、工具設備比較、不同價格帶比較。
  5. 任務挑戰：要有高/低成本、限時間、限地點、一天內、三小時內、幫某對象完成某結果等任務限制。
  6. 事件體驗：拍新奇體驗、奇葩規則、角色互換、當一天某身份、從新手視角重新體驗。
- 曬過程選題範例，以短影音教學為例：
  - 過程展示：紀錄我給學員訂製進階客腳本全過程
  - 測評產品：對比五款拍攝設備，哪款最適合新手
  - 任務挑戰：挑戰一天幫企業打造三套可落地的短影音
  - 事件體驗：當一天短影音新手，體驗學員從零學起的真實感受
- 不要使用 emoji
- 不要輸出 JSON 以外的文字`,
  },
  script: {
    feature_key: 'script',
    name: '爆款選題腳本 Agent',
    model: 'gpt-4.1-mini',
    temperature: 0.2,
    system_prompt: '你是 TOP LEVEL TRAFFIC 的爆款選題腳本智能體。你負責三個連續任務：產生爆款選題、依選題寫出符合課程句式的爆款文案、最後對照學員練習是否符合課程框架。你不是只定位為老師或批改者；只有在 evaluate_practice 任務時才進入練習對照模式。已上傳的知識庫 PDF 是產生腳本的重要依據，不只是練習判斷用；若有 file_search / vector store，必須優先依據知識庫案例、句式、框架與限制條件生成。所有輸出都要白話、短句、像真人講話，把使用者當成完全不懂的新手，不要學術、不要繞、不要難懂，國中生也要看得懂。當 scriptType=knowledge 或腳本類型=教知識時，必須嚴格使用三段式「教知識腳本 SOP」：第一段是場景難題，並由系統在推薦型或解題型中擇一判斷腳本類型，腳本類型只能寫在內容裡，不可出現在標題；第二段是低行動成本解決方案；第三段是具體操作過程。三段都必須符合自檢：信息多、效果快、料夠猛。當 scriptType=opinion 或腳本類型=說觀點時，必須嚴格使用四段式「說觀點腳本 SOP」：開篇、歸納論據或正反論證、總結觀點、金句。開篇一定要用否定句或反問句，將原選題改成有立場的觀點。論據全部寫在同一段「歸納論據或正反論證」裡，不要拆成兩個欄位。觀點型論據技法包含七種：權衡利弊、無奈之舉、顛覆認知、不同視角、人身攻擊、倒打一耙、維度升級；不要只固定使用其中三種。說觀點有兩大結構：歸納論證與正反論證。歸納論證必須用三段論據，每段從七種技法中選一種並標明；正反論證必須先寫反面案例，再寫正面案例。當 scriptType=story 或腳本類型=說故事時，必須嚴格使用說故事腳本 SOP。故事不是主流論點，而是信任建立；核心目的是交友破冰，用經歷換人心。故事分三種：小有成就、成功案例、平凡英雄。小有成就講自己比過去更好；成功案例講你如何幫助別人達成成果，必須同時有你幫他的部分與他自己努力的部分；平凡英雄講你用價值觀和方法解決不公平或困境。故事必須有困境與轉機，困境可用盲目自信、家門不幸、天災人禍、惡霸欺壓、過河拆橋、至親背叛、強權干涉；轉機可用通關密碼、至親所託、天賦異稟、意外之喜、因禍得福、貴人相助、破釜沈舟。困境橋段與轉機橋段都是可穿插使用的故事文法，請依故事邏輯選最適合的組合，不要固定只用同一組。每次生成說故事腳本時，困難與轉機橋段必須從清單中隨機或輪替變換。除非題目明確需要，禁止每次固定使用「盲目自信、通關密碼、過河拆橋、貴人相助」這組範例橋段。家門不幸不是單純家裡有事，而是主角目前的家境、現有環境、身邊人事物或資源條件都不好：例如家裡缺錢、環境不支持、設備不足、身邊人唱衰、原本的人脈或條件都不站在主角這邊。至親所託的意思是親人對主角的寄望、託付或希望，例如父母、伴侶、孩子、長輩把某個期待交到主角身上；如果是朋友、同事、客戶、老師或外人幫助主角，那是貴人相助，不是至親所託。整個【困境與轉機】都必須有爽劇感，不是只有結尾。每個困難都要有壓迫、羞辱、被看不起、資源被搶、代價升高或局勢變糟；每個轉機都要有反擊、翻身、打臉、局勢反轉或讓人覺得解氣的畫面。最後一個轉機必須寫得最多、最爽、最解氣，是整段高潮。可以讓前面欺壓、看不起、打壓主角的人，最後回頭來投靠、拜託、求合作、認錯或被現實打臉。說故事要把經典橋段寫成爽劇，不只是平淡解決問題。參考案例一：年輕村長故事的節奏是「意外之喜：年輕人意外站上權力位置」→「家門不幸：村子破敗、負債、資源荒涼」→「至親所託：看見父親驕傲或親人期待，重新接住使命」→「破釜沈舟：從最基礎建設開始硬幹」→「通關密碼：找到牆繪或新的引流方法」→「貴人相助：媒體、領導或外部資源進來，村子翻身」。參考案例二：地攤翻身故事的節奏是「盲目自信：選錯位置、欠債壓貨」→「意外之喜：發現地鐵口人流」→「通關密碼：找到布藝本子這個爆品」→「惡霸欺壓：同行眼紅搶貨、趕人」→「貴人相助：大客戶大量下單」→「爽劇高潮：靠訂單翻身，買房、打臉過去看不起的人」。最後的爽劇高潮可以寫在最後一個轉機內容裡，但不要把「最終崛起」當成橋段標籤。故事選題與腳本一定要圍繞自己達成的成就、你幫別人達成的成就，或你用價值觀解決的衝突事件；【困境與轉機】的 body 必須只用固定格式：困難：橋段名 換行 內容；空一行；轉機：橋段名 換行 內容；空一行；困難：橋段名 換行 內容；空一行；轉機：橋段名 換行 內容。禁止寫成一整段，禁止使用「困難1（橋段名）：」或「轉機1（橋段名）：」。困境與轉機不是寫意思、不是摘要、不是分析，而是要寫出具體故事事件；每一輪都要像編劇寫劇情，有時間點、地點、人物、事件、對話、代價與結果。橋段名稱只是內部方向，不是正文內容；不要把「盲目自信」寫成一句解釋，而要用一整段事件讓觀眾自然看出盲目自信，例如公司虧錢、看到短視頻崛起、自認導演背景很強、接案後播放量很低、客戶追退款、借錢補洞。禁止寫「第一輪困難是」「第一輪轉機是」「這是典型的」這種說明句。故事要用畫面詞代替感受詞，不要只說我很難過、我很高興、我很辛苦。請使用繁體中文。只能輸出 JSON，不要輸出 Markdown，不要使用 emoji。',
    user_prompt_template: `請依據以下輸入執行 TOP LEVEL TRAFFIC 爆款選題腳本流程。

使用者輸入：
{{input}}

使用者方案：
{{userPlan}}

輸出要求：
- 若 input.task = "generate_script"，必須依照 input.scriptType 回傳 JSON object。knowledge 使用三段，opinion 使用四段：
  {
    "sections": [
      { "heading": "【依腳本類型指定的段落標題】", "body": "..." }
    ]
  }
- generate_script 必須依照 input.scriptType 生成：
  knowledge=教知識、opinion=說觀點、story=說故事、process=曬過程
- 當 input.scriptType = "knowledge" 時，必須嚴格使用教知識腳本 SOP：
  第一段：【場景難題】。說清楚觀眾遇到的具體情境與難題，並由系統在推薦型或解題型中擇一，寫進內容裡，不要放在標題。
  第二段：【低行動成本解決方案】。給一個觀眾今天就能做、成本低、門檻低的解法。
  第三段：【具體操作過程】。用清楚步驟寫出如何執行。
  每一段都必須符合：
  信息多：至少 2-3 個具體資訊點，例如清單、數字、判斷標準、對比或案例。
  效果快：必須有觀眾今天就能做的小動作，不可以只給長期心法。
  料夠猛：至少加入一個反常識、痛點命中、踩坑提醒、真實場景或具體案例。
  禁止輸出中規中矩的泛泛論點，例如「設定目標、善用工具、提升效率」這種沒有新鮮感的句子。
  禁止輸出第四段，禁止輸出【教知識影片腳本】。
  不要輸出【選題維度】、【腳本自檢】、【常見錯誤避開】當主要段落。
  不要輸出【鉤子 · 前 3 秒】、【問題引入】、【主體內容】、【結尾 CTA】這種通用框架。
- 當 input.scriptType = "opinion" 時，必須嚴格使用說觀點腳本 SOP：
  必須把已上傳知識庫 PDF 當成生成腳本的主要依據，不只是批改練習用。若知識庫有對應案例、句式或框架，優先依照知識庫。
  語氣要非常白話，像講給完全不懂的新手聽。句子要短，意思要直，不要學術，不要難懂，國中生也要看得懂。
  第一段：【開篇】。一定要用否定句或反問句開場，直接把原選題改成有立場的觀點。例如「公寓與住宅的購買解析」要改成「千萬不要買公寓」；「結婚之後過年一定要去男方家過年嗎？」要改成「憑什麼結婚之後過年必須回公婆家」。
  第二段：【歸納論據或正反論證】。論據全部寫在這一段裡，不要拆成【論據1】與【論據2】兩個段落。段內必須清楚標明每一段文法，例如：
  觀點型論據技法共有七種，可依選題選用：權衡利弊、無奈之舉、顛覆認知、不同視角、人身攻擊、倒打一耙、維度升級。
  技法定義：
  1. 權衡利弊：做了 A 可能失去 B，做了 B 可能失去 A，強調選擇取捨。
  2. 無奈之舉：不是不想做正確的事，而是現實條件不允許。
  3. 顛覆認知：推翻大家原本以為正確的觀念。
  4. 不同視角：用另一個身份、角色或時間點重新解釋同一件事。
  5. 人身攻擊：直接批判某一類人，讓目標受眾覺得被替自己出氣；高風險，只在適合人設時使用。
  6. 倒打一耙：把責任反推回去，用強情緒表達替受眾說出不敢說的話。
  7. 維度升級：從現在、過去、未來、成本、風險、結構、系統、後果拉高層次分析。
  你必須先在「歸納論據或正反論證」段落開頭標明本次使用哪一種結構：
  結構一：歸納論證。格式為「論據1（技法）」「論據2（技法）」「論據3（技法）」，三段論據各自選一種技法。
  結構二：正反論證。格式為「反面案例（技法）」「正面案例（技法）」，先反後正，讓觀眾看到錯誤做法與正確做法的差異。
  不要只固定使用不同視角、權衡利弊、倒打一耙。要依照選題、受眾、衝突與 PDF 句式選最適合的技法。
  每一個文法都要寫成一整段，不可以只有一句話。每段至少 3 到 5 句，要像短影音口播稿。每段都要放生活場景、白話比喻或觀眾日常會遇到的狀況，不能只講抽象道理。
  第三段：【總結觀點】。回扣開篇立場，說明不是全盤否定，而是提醒受眾真正該看清楚的代價、處境或選擇。
  第四段：【金句】。用一句可被記住、可轉發、情緒明確的金句收束。
  觀點不是教育粉絲，也不是罵觀眾；觀點是「我理解你，所以我幫你說出來」。
  觀點內容要讓特定受眾感覺：你站在我這邊、你把我不敢講的話講出來了、你替我出了一口氣、我想支持你、我想轉發給某個人看。
  禁止輸出【論據1】與【論據2】作為獨立段落。論據只能合併在【歸納論據或正反論證】。
  禁止只寫一句話的論據，禁止像報告摘要，禁止艱深詞語。
  禁止輸出【表明觀點】、【論據歸納／正反論證】、【金句總結】三段式。
  禁止輸出【反常識立場】、【錯誤認知】、【核心觀點】、【例子對比】、【行動收束】這種舊框架。
  禁止中立評論；必須有站隊、有情緒、有兩段論據、有金句。
- 當 input.scriptType = "story" 時，必須嚴格使用說故事腳本 SOP：
  必須把已上傳知識庫 PDF 當成生成故事腳本的主要依據。若知識庫有故事案例、橋段、句式或框架，優先依照知識庫。
  故事的目的不是主流論點，而是交友破冰，用經歷換人心，拉近博主與粉絲距離，建立成交信任與鐵粉效應。
  故事選題與腳本都必須圍繞三種素材之一：自己達成的成就、你幫別人達成的成就、你用價值觀解決的衝突事件。禁止寫成知識解析、觀點評論、技巧清單或泛泛經驗談。
  你必須先判斷最適合的故事類型：
  1. 小有成就：展示自己比過去更好的經歷。成就不是和別人比，而是昨天的你 vs 今天的你。
  2. 成功案例：展示你如何幫助別人達成成果。必須同時有「你幫他的部分」和「他自己努力的部分」。
  3. 平凡英雄：用自己的價值觀和方法解決他人的困境，展示人品與正向價值觀。
  輸出順序必須只有四段：
  第一段：【故事類型】。說明這支採用小有成就、成功案例或平凡英雄，並點出為什麼。
  第二段：【成就或衝突事件】。第一句直接進入主題。小有成就寫已達成的成就；成功案例寫別人的成就；平凡英雄寫不公平或衝突事件。第一句要像短影音開場，例如「沒想到我一個___，靠___做到___，只不過___」、「我幫一個___，從___做到___，中間差點卡在___」、「那天我遇到___，我沒有選擇___，而是___」。
  第三段：【困境與轉機】。必須寫出困境和轉機。【困境與轉機】的 body 必須只用以下固定格式，不可改格式，不可寫成整段：
  困難：橋段名
  內容...

  轉機：橋段名
  內容...

  困難：橋段名
  內容...

  轉機：橋段名
  內容...
  每個「困難：」與「轉機：」下面都必須是具體故事事件，不是意思、摘要、分析或課程說明。每一小段至少 4 到 7 句，要有時間點、地點、人物動作、對話或訊息、金錢或結果代價。困境要逐層變難，轉機要逐層更有力。橋段名稱只是標籤，內容才是正文。不要把「盲目自信、過河拆橋、貴人相助」寫成一句成語解釋，也不要順接成語；要把它翻成一整段事件。例如盲目自信不是寫「我太自信所以失敗」，而是寫：公司虧錢、宣傳片案子變少、新聞看到短視頻崛起、我以為十年導演背景做短視頻很簡單、接了客戶後播放量只有幾百、客戶打電話要退款、帳上沒錢只好借錢補洞。整段事件讓人自然感覺出「盲目自信」。禁止寫「第一輪困難是客戶因為...」「第一輪轉機是我...」「第二輪困難是...」這種摘要句；要直接寫成事件，例如「那天中午我正在吃飯，客戶突然打電話來...」「隔天早上他拿著檢查報告站在門口...」。要像編劇寫一場戲：困境要讓觀眾看見事情怎麼壞掉，轉機要讓觀眾看見事情怎麼被扭回來。
  第四段：【感悟與收束】。寫出這段經歷的啟示。平凡英雄必須正向呼籲或苦中作樂，不可以抱怨式結尾。
  可用困境橋段：盲目自信、家門不幸、天災人禍、惡霸欺壓、過河拆橋、至親背叛、強權干涉。
  可用轉機橋段：通關密碼、至親所託、天賦異稟、意外之喜、因禍得福、貴人相助、破釜沈舟。
  家門不幸不是單純家裡有事，而是主角目前的家境、現有環境、身邊人事物或資源條件都不好：例如家裡缺錢、環境不支持、設備不足、身邊人唱衰、原本的人脈或條件都不站在主角這邊。
  困境橋段與轉機橋段都是可穿插使用的故事文法，請依故事邏輯選最適合的組合，不要固定只用同一組。
  每次生成說故事腳本時，困難與轉機橋段必須從清單中隨機或輪替變換。除非題目明確需要，禁止每次固定使用「盲目自信、通關密碼、過河拆橋、貴人相助」這組範例橋段。
  至親所託的意思是親人對主角的寄望、託付或希望，例如父母、伴侶、孩子、長輩把某個期待交到主角身上；如果是朋友、同事、客戶、老師或外人幫助主角，那是貴人相助，不是至親所託。
  整個【困境與轉機】都必須有爽劇感，不是只有結尾。每個困難都要有壓迫、羞辱、被看不起、資源被搶、代價升高或局勢變糟；每個轉機都要有反擊、翻身、打臉、局勢反轉或讓人覺得解氣的畫面。
  最後一個轉機必須寫得最多、最爽、最解氣，是整段高潮。可以讓前面欺壓、看不起、打壓主角的人，最後回頭來投靠、拜託、求合作、認錯或被現實打臉。說故事要把經典橋段寫成爽劇，不只是平淡解決問題。
  參考案例一：年輕村長故事的節奏是「意外之喜：年輕人意外站上權力位置」→「家門不幸：村子破敗、負債、資源荒涼」→「至親所託：看見父親驕傲或親人期待，重新接住使命」→「破釜沈舟：從最基礎建設開始硬幹」→「通關密碼：找到牆繪或新的引流方法」→「貴人相助：媒體、領導或外部資源進來，村子翻身」。
  參考案例二：地攤翻身故事的節奏是「盲目自信：選錯位置、欠債壓貨」→「意外之喜：發現地鐵口人流」→「通關密碼：找到布藝本子這個爆品」→「惡霸欺壓：同行眼紅搶貨、趕人」→「貴人相助：大客戶大量下單」→「爽劇高潮：靠訂單翻身，買房、打臉過去看不起的人」。最後的爽劇高潮可以寫在最後一個轉機內容裡，但不要把「最終崛起」當成橋段標籤。
  平凡英雄解決問題可用：敢做敢當、即時回懟、即時面對、堅守原則、隨手幫助、照護弱勢。
  開篇必須直接進入主題，不要花大量文字介紹出身、入行經歷或家庭背景。
  必須用畫面詞代替感受詞。禁止只寫「我很難過、我很高興、我很辛苦」；要改成具體動作、場景和細節，例如「那天晚上我盯著天花板到天亮」。
  禁止故事一帆風順，禁止沒有困境起伏，禁止成功案例中沒有你幫他的部分，禁止平凡英雄用抱怨收尾。
- 當 input.scriptType = "process" 時，必須嚴格使用曬過程腳本 SOP：
  曬過程不是流水帳，也不是普通工作紀錄。曬過程要像節目一樣設計，每一個橋段都要有鉤子企劃，讓觀眾想看下一秒。
  曬過程有四個腳本方向：過程展示、測評產品、任務挑戰、事件體驗。請依選題判斷最適合的方向。
  六大鉤子可用：送溫暖、金錢、驗證/解密、賀爾蒙、盲盒、對抗。
  送溫暖：給養老院、孤兒院、弱勢群體、學員、客戶或陌生人送禮物、資源、服務，或大量買下對方需要的東西。
  金錢：花大錢、花小錢辦大事、免費、賺錢、省錢、成本挑戰、低預算完成任務。
  驗證/解密：解秘真假、挑戰權威、揭秘隱私、創根問底、驗證身份、驗證方法是否成功。
  賀爾蒙：黑絲、長髮、肌肉、明星臉、搭訕、變裝、跳舞、誘惑、大尺度；只在題材自然適合時使用，不要低俗或硬塞。
  盲盒：抽到什麼穿什麼、吃什麼、做什麼、用什麼、幹什麼，或抽到驚喜禮物。
  對抗：下賭注、吵架、被阻止、發生意外、故意整人、有人不相信、有人唱反調。
  每支曬過程腳本至少使用 3 個鉤子。每個主要橋段都要標明「鉤子：XXX」，再寫這個橋段怎麼拍。
  輸出順序必須只有四段：【節目企劃】、【過程橋段】、【反轉/看點】、【結果收束】。
  【節目企劃】：說明這支採用哪個曬過程方向，核心任務是什麼，規則或限制是什麼，觀眾為什麼會想看。
  【過程橋段】：用 3 到 5 個小橋段寫出拍攝流程。每個小橋段都必須包含「橋段名」「鉤子」「畫面怎麼拍」「觀眾想看的點」。
  【反轉/看點】：安排至少 1 個意外、對抗、測試失敗、結果出乎意料、成本爆掉、時間不夠、對方反應超出預期的段落。
  【結果收束】：交代最後成果、數字、對比或人物反應，再收一個讓觀眾想留言、想問、想看下一集的結尾。
  禁止只寫「準備階段、執行過程、遇到困難、結果」這種流水帳。每段都要有節目鉤子、有畫面、有懸念。
- generate_script 必須參考知識庫腳本句式，不要使用通用模板；知識庫 PDF 是生成依據，不只是 evaluate_practice 的判斷依據。
- 若 input.task = "evaluate_practice"，才回傳 approved、score、summary、strengths、improvements、matched_patterns、required_revision
- 不要輸出 JSON 以外的文字`,
  },
}

const STORY_EVENT_RULE = '當 scriptType=story 或腳本類型=說故事時，可用困境橋段：盲目自信、家門不幸、天災人禍、惡霸欺壓、過河拆橋、至親背叛、強權干涉。可用轉機橋段：通關密碼、至親所託、天賦異稟、意外之喜、因禍得福、貴人相助、破釜沈舟。這些都是可穿插使用的故事文法，請依故事邏輯選最適合的組合，不要固定只用同一組。每次生成說故事腳本時，困難與轉機橋段必須從清單中隨機或輪替變換。除非題目明確需要，禁止每次固定使用「盲目自信、通關密碼、過河拆橋、貴人相助」這組範例橋段。家門不幸不是單純家裡有事，而是主角目前的家境、現有環境、身邊人事物或資源條件都不好：例如家裡缺錢、環境不支持、設備不足、身邊人唱衰、原本的人脈或條件都不站在主角這邊。至親所託的意思是親人對主角的寄望、託付或希望，例如父母、伴侶、孩子、長輩把某個期待交到主角身上；如果是朋友、同事、客戶、老師或外人幫助主角，那是貴人相助，不是至親所託。整個【困境與轉機】都必須有爽劇感，不是只有結尾。每個困難都要有壓迫、羞辱、被看不起、資源被搶、代價升高或局勢變糟；每個轉機都要有反擊、翻身、打臉、局勢反轉或讓人覺得解氣的畫面。最後一個轉機必須寫得最多、最爽、最解氣，是整段高潮。可以讓前面欺壓、看不起、打壓主角的人，最後回頭來投靠、拜託、求合作、認錯或被現實打臉。說故事要把經典橋段寫成爽劇，不只是平淡解決問題。參考案例一：年輕村長故事的節奏是「意外之喜：年輕人意外站上權力位置」→「家門不幸：村子破敗、負債、資源荒涼」→「至親所託：看見父親驕傲或親人期待，重新接住使命」→「破釜沈舟：從最基礎建設開始硬幹」→「通關密碼：找到牆繪或新的引流方法」→「貴人相助：媒體、領導或外部資源進來，村子翻身」。參考案例二：地攤翻身故事的節奏是「盲目自信：選錯位置、欠債壓貨」→「意外之喜：發現地鐵口人流」→「通關密碼：找到布藝本子這個爆品」→「惡霸欺壓：同行眼紅搶貨、趕人」→「貴人相助：大客戶大量下單」→「爽劇高潮：靠訂單翻身，買房、打臉過去看不起的人」。最後的爽劇高潮可以寫在最後一個轉機內容裡，但不要把「最終崛起」當成橋段標籤。【困境與轉機】的 body 必須只用固定格式：困難：橋段名 換行 內容；空一行；轉機：橋段名 換行 內容；空一行；困難：橋段名 換行 內容；空一行；轉機：橋段名 換行 內容。禁止寫成一整段，禁止使用「困難1（橋段名）：」或「轉機1（橋段名）：」。橋段名稱只是標籤，內容才是正文。不要把「盲目自信、過河拆橋、貴人相助」寫成一句成語解釋，也不要順接成語；要把它翻成一整段事件。例如盲目自信不是寫「我太自信所以失敗」，而是寫：公司虧錢、宣傳片案子變少、新聞看到短視頻崛起、我以為十年導演背景做短視頻很簡單、接了客戶後播放量只有幾百、客戶打電話要退款、帳上沒錢只好借錢補洞。整段事件要讓觀眾自然感覺出「盲目自信」。'
const PROCESS_SCRIPT_RULE = '當 scriptType=process 或腳本類型=曬過程時，必須嚴格使用曬過程腳本 SOP。曬過程不是流水帳，也不是普通工作紀錄；曬過程要像節目一樣設計，每一個橋段都要有鉤子企劃，讓觀眾想看下一秒。曬過程有四個腳本方向：過程展示、測評產品、任務挑戰、事件體驗。六大鉤子可用：送溫暖、金錢、驗證/解密、賀爾蒙、盲盒、對抗。送溫暖=給養老院、孤兒院、弱勢群體、學員、客戶或陌生人送禮物、資源、服務，或大量買下對方需要的東西。金錢=花大錢、花小錢辦大事、免費、賺錢、省錢、成本挑戰、低預算完成任務。驗證/解密=解秘真假、挑戰權威、揭秘隱私、創根問底、驗證身份、驗證方法是否成功。賀爾蒙=黑絲、長髮、肌肉、明星臉、搭訕、變裝、跳舞、誘惑、大尺度；只在題材自然適合時使用，不要低俗或硬塞。盲盒=抽到什麼穿什麼、吃什麼、做什麼、用什麼、幹什麼，或抽到驚喜禮物。對抗=下賭注、吵架、被阻止、發生意外、故意整人、有人不相信、有人唱反調。每支曬過程腳本至少使用 3 個鉤子。每個主要橋段都要標明「鉤子：XXX」，再寫這個橋段怎麼拍。輸出順序必須只有四段：【節目企劃】、【過程橋段】、【反轉/看點】、【結果收束】。【過程橋段】要用 3 到 5 個小橋段，每個小橋段都包含「橋段名」「鉤子」「畫面怎麼拍」「觀眾想看的點」。禁止只寫「準備階段、執行過程、遇到困難、結果」這種流水帳。每段都要有節目鉤子、有畫面、有懸念。'
const PROCESS_TOPIC_RULE = '當 input.scriptType = "process" 或腳本類型為曬過程時，選題只能使用四個腳本方向：過程展示、測評產品、任務挑戰、事件體驗。8 個選題必須四種方向各至少 2 題，element 依序使用：過程展示、測評產品、任務挑戰、事件體驗、過程展示、測評產品、任務挑戰、事件體驗。過程展示要拍進貨、諮詢、服務、售後、接需求到交付、從想法到成品等完整流程；測評產品要拍對比測評、極限測評、化驗測評、工具設備比較、不同價格帶比較；任務挑戰要有高/低成本、限時間、限地點、一天內、三小時內、幫某對象完成某結果等任務限制；事件體驗要拍新奇體驗、奇葩規則、角色互換、當一天某身份、從新手視角重新體驗。以短影音教學為例：過程展示=紀錄我給學員訂製進階客腳本全過程；測評產品=對比五款拍攝設備，哪款最適合新手；任務挑戰=挑戰一天幫企業打造三套可落地的短影音；事件體驗=當一天短影音新手，體驗學員從零學起的真實感受。禁止輸出一般日常紀錄、普通工具清單、泛泛流程公開，除非它明確屬於上述四個方向。'

function ensureAgentRules(agent) {
  if (!agent) return agent
  if (agent.feature_key === 'script') {
    const withRule = text => {
      let next = String(text || '')
      if (!next.includes('整段事件要讓觀眾自然感覺出「盲目自信」')) {
        next = `${next}\n\n${STORY_EVENT_RULE}`.trim()
      }
      if (!next.includes('曬過程要像節目一樣設計')) {
        next = `${next}\n\n${PROCESS_SCRIPT_RULE}`.trim()
      }
      return next
    }
    return {
      ...agent,
      system_prompt: withRule(agent.system_prompt),
      user_prompt_template: withRule(agent.user_prompt_template),
    }
  }
  if (agent.feature_key === 'topics') {
    const withRule = text => String(text || '').includes('過程展示=紀錄我給學員訂製進階客腳本全過程')
    ? text
      : `${text || ''}\n\n${PROCESS_TOPIC_RULE}`.trim()
    return {
      ...agent,
      system_prompt: withRule(agent.system_prompt),
      user_prompt_template: withRule(agent.user_prompt_template),
    }
  }
  return agent
}

// ── CORS ──────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function err(msg, status = 400) {
  return json({ success: false, error: msg }, status)
}

// ── Router ────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url  = new URL(request.url)
    const path = url.pathname

    try {
      // POST /api/upload/start  → get a direct-upload URL from CF Stream
      if (path === '/api/upload/start' && request.method === 'POST') {
        return await handleUploadStart(request, env)
      }

      // GET /api/course-catalog → shared course catalog for students/admin
      if (path === '/api/course-catalog' && request.method === 'GET') {
        return await handleGetCourseCatalog(env)
      }

      // PUT /api/admin/course-catalog → replace shared course catalog
      if (path === '/api/admin/course-catalog' && request.method === 'PUT') {
        return await handleUpdateCourseCatalog(request, env)
      }

      // GET /api/videos  → list all videos in the account
      if (path === '/api/videos' && request.method === 'GET') {
        return await handleListVideos(env)
      }

      // GET /api/videos/:uid  → single video details
      if (path.startsWith('/api/videos/') && request.method === 'GET') {
        const uid = path.slice('/api/videos/'.length)
        return await handleGetVideo(uid, env)
      }

      // DELETE /api/videos/:uid  → delete video
      if (path.startsWith('/api/videos/') && request.method === 'DELETE') {
        const uid = path.slice('/api/videos/'.length)
        return await handleDeleteVideo(uid, env)
      }

      // POST /api/token/:uid  → generate signed playback token
      if (path.startsWith('/api/token/') && request.method === 'POST') {
        const uid = path.slice('/api/token/'.length)
        return await handleToken(request, uid, env)
      }

      // GET /api/calendar/availability?date=YYYY-MM-DD&type=oneonone
      if (path === '/api/calendar/availability' && request.method === 'GET') {
        return await handleCalendarAvailability(url, env)
      }

      // POST /api/ai → server-side AI generation
      if (path === '/api/ai' && request.method === 'POST') {
        return await handleAI(request, env)
      }

      // POST /api/ai/writing/evaluate → evaluate a student's writing practice against agent knowledge
      if (path === '/api/ai/writing/evaluate' && request.method === 'POST') {
        return await handleWritingEvaluation(request, env)
      }

      // POST /api/ai/knowledge/sync → attach an uploaded PDF to an agent vector store
      if (path === '/api/ai/knowledge/sync' && request.method === 'POST') {
        return await handleAIKnowledgeSync(request, env)
      }

      // POST /api/checkout/orders → create a pending checkout order
      if (path === '/api/checkout/orders' && request.method === 'POST') {
        return await handleCreateCheckoutOrder(request, env)
      }

      // POST /api/memberships/start → start current user's membership on first login
      if (path === '/api/memberships/start' && request.method === 'POST') {
        return await handleStartMembership(request, env)
      }

      // GET/POST /api/course-progress → current user's course watch progress
      if (path === '/api/course-progress' && request.method === 'GET') {
        return await handleGetCourseProgress(request, url, env)
      }
      if (path === '/api/course-progress' && request.method === 'POST') {
        return await handleSaveCourseProgress(request, env)
      }

      // POST /api/auth/last-login → record current user's successful login time
      if (path === '/api/auth/last-login' && request.method === 'POST') {
        return await handleRecordLastLogin(request, env)
      }

      // POST /api/ecpay/return → ECPay server-side payment notification
      if (path === '/api/ecpay/return' && request.method === 'POST') {
        return await handleEcpayReturn(request, env)
      }

      // POST /api/ecpay/result → ECPay client-side payment result redirect
      if (path === '/api/ecpay/result' && request.method === 'POST') {
        return await handleEcpayResult(request, env)
      }

      // POST /api/newebpay/notify → NewebPay server-side payment notification
      if (path === '/api/newebpay/notify' && request.method === 'POST') {
        return await handleNewebPayNotify(request, env)
      }

      // POST /api/newebpay/result → NewebPay client-side payment result redirect
      if (path === '/api/newebpay/result' && request.method === 'POST') {
        return await handleNewebPayResult(request, env)
      }

      // GET /api/admin/orders → list checkout orders
      if (path === '/api/admin/orders' && request.method === 'GET') {
        return await handleListOrders(request, env)
      }

      // PATCH /api/admin/orders/:id → mark an order paid/cancelled
      if (path.startsWith('/api/admin/orders/') && request.method === 'PATCH') {
        const orderId = decodeURIComponent(path.slice('/api/admin/orders/'.length))
        return await handleUpdateOrder(request, orderId, env)
      }

      // DELETE /api/admin/orders/:id → delete a checkout order record
      if (path.startsWith('/api/admin/orders/') && request.method === 'DELETE') {
        const orderId = decodeURIComponent(path.slice('/api/admin/orders/'.length))
        return await handleDeleteOrder(request, orderId, env)
      }

      // POST /api/admin/students/provision → manually open access for an offline purchaser
      if (path === '/api/admin/students/provision' && request.method === 'POST') {
        return await handleProvisionStudent(request, env)
      }

      // GET /api/admin/students → list formal student memberships
      if (path === '/api/admin/students' && request.method === 'GET') {
        return await handleListStudents(request, env)
      }

      // GET /api/admin/learning-progress → list all student course watch progress
      if (path === '/api/admin/learning-progress' && request.method === 'GET') {
        return await handleLearningProgress(request, env)
      }

      // POST /api/admin/learning-progress/reminders → record learning reminders
      if (path === '/api/admin/learning-progress/reminders' && request.method === 'POST') {
        return await handleSendLearningReminders(request, env)
      }

      // POST /api/admin/students/:id/password → reset a student password
      if (path.startsWith('/api/admin/students/') && path.endsWith('/password') && request.method === 'POST') {
        const userId = decodeURIComponent(path.slice('/api/admin/students/'.length, -'/password'.length))
        return await handleResetStudentPassword(request, userId, env)
      }

      // PATCH /api/admin/students/:id → update profile status or open a new membership
      if (path.startsWith('/api/admin/students/') && request.method === 'PATCH') {
        const userId = decodeURIComponent(path.slice('/api/admin/students/'.length))
        return await handleUpdateStudent(request, userId, env)
      }

      // DELETE /api/admin/students/:id → permanently delete a student account
      if (path.startsWith('/api/admin/students/') && request.method === 'DELETE') {
        const userId = decodeURIComponent(path.slice('/api/admin/students/'.length))
        return await handleDeleteStudent(request, userId, env)
      }

      // POST /api/calendar/events → create a confirmed booking event
      if (path === '/api/calendar/events' && request.method === 'POST') {
        return await handleCreateCalendarEvent(request, env)
      }

      // PATCH /api/calendar/events/:eventId → update a booking event
      if (path.startsWith('/api/calendar/events/') && request.method === 'PATCH') {
        const eventId = decodeURIComponent(path.slice('/api/calendar/events/'.length))
        return await handleUpdateCalendarEvent(request, eventId, env)
      }

      // DELETE /api/calendar/events/:eventId → delete a booking event
      if (path.startsWith('/api/calendar/events/') && request.method === 'DELETE') {
        const eventId = decodeURIComponent(path.slice('/api/calendar/events/'.length))
        return await handleDeleteCalendarEvent(request, eventId, env)
      }

      return err('Not found', 404)
    } catch (e) {
      console.error(e)
      return err(e.message, 500)
    }
  },
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleUploadStart(request, env) {
  const body = await request.json().catch(() => ({}))
  const uploadLength = Number(body.size || body.uploadLength || 0)
  const name = String(body.name || 'Untitled').trim() || 'Untitled'
  const maxDurationSeconds = Number(body.maxDurationSeconds || 3600)
  const uploadMethod = String(body.uploadMethod || 'tus').toLowerCase()

  if (uploadLength > 0 && uploadMethod !== 'form') {
    const metadata = [
      ['name', name],
      ['requiresignedurls', 'true'],
      ['maxdurationseconds', String(maxDurationSeconds)],
    ].map(([key, value]) => `${key} ${base64Encode(value)}`).join(',')

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(uploadLength),
          'Upload-Metadata': metadata,
        },
      }
    )
    const uploadURL = response.headers.get('Location')
    const uid = response.headers.get('stream-media-id')
    if (!response.ok || !uploadURL || !uid) {
      const errorText = await response.text().catch(() => '')
      return json({
        success: false,
        result: null,
        errors: [{ message: errorText || `Cloudflare TUS upload create failed: ${response.status}` }],
        messages: [],
      }, response.ok ? 502 : response.status)
    }
    return json({
      success: true,
      result: { uploadURL, uid, tus: true },
      errors: [],
      messages: [],
    })
  }

  return json(await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    'POST', env,
    {
      maxDurationSeconds,
      requireSignedURLs: true,
      meta: { name },
    }
  ))
}

async function handleListVideos(env) {
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`,
    'GET', env
  )
  return json(res)
}

async function handleGetVideo(uid, env) {
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    'GET', env
  )
  return json(res)
}

async function handleDeleteVideo(uid, env) {
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    'DELETE', env
  )
  return json(res)
}

async function handleGetCourseCatalog(env) {
  const catalog = await getCourseCatalog(env)
  return json({ success: true, catalog })
}

async function handleUpdateCourseCatalog(request, env) {
  await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  const catalog = {
    courses: Array.isArray(body.courses) ? body.courses : [],
    cfVideos: Array.isArray(body.cfVideos) ? body.cfVideos : [],
    videoAssignments: body.videoAssignments && typeof body.videoAssignments === 'object' ? body.videoAssignments : {},
  }
  const saved = await upsertCourseCatalog(env, catalog)
  return json({ success: true, catalog: saved })
}

function normalizeCourseProgressRow(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    currentSecond: row.current_second || 0,
    completed: !!row.completed,
    completedAt: row.completed_at || null,
    watchCount: row.watch_count || 0,
    updatedAt: row.updated_at || null,
  }
}

async function handleGetCourseProgress(request, url, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Course progress storage is not configured', 503)
  }

  let user
  try {
    user = await requireUser(request, env)
  } catch (error) {
    return err(error.message || 'Unauthorized', 401)
  }
  const courseId = Number(url.searchParams.get('courseId'))
  if (!Number.isFinite(courseId)) return err('Missing course id', 400)

  const lessonIds = String(url.searchParams.get('lessonIds') || '')
    .split(',')
    .map(value => Number(value.trim()))
    .filter(Number.isFinite)

  const progressUrl = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_progress`)
  progressUrl.searchParams.set('select', 'user_id,course_id,lesson_id,current_second,completed,completed_at,watch_count,updated_at')
  progressUrl.searchParams.set('user_id', `eq.${user.id}`)
  progressUrl.searchParams.set('course_id', `eq.${courseId}`)
  if (lessonIds.length > 0) {
    progressUrl.searchParams.set('lesson_id', `in.(${lessonIds.join(',')})`)
  }

  const response = await fetch(progressUrl.toString(), {
    headers: serviceRoleHeaders(env),
  })
  const rows = await response.json().catch(() => [])
  if (!response.ok) {
    const message = rows?.message || rows?.error || 'Course progress load failed'
    throw new Error(message)
  }

  return json({
    success: true,
    progress: Array.isArray(rows) ? rows.map(normalizeCourseProgressRow) : [],
  })
}

async function handleSaveCourseProgress(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Course progress storage is not configured', 503)
  }

  let user
  try {
    user = await requireUser(request, env)
  } catch (error) {
    return err(error.message || 'Unauthorized', 401)
  }
  const body = await request.json().catch(() => ({}))
  const courseId = Number(body.courseId)
  const lessonId = Number(body.lessonId)
  const currentSecond = Math.max(0, Math.floor(Number(body.currentSecond || 0)))
  const completed = Boolean(body.completed)

  if (!Number.isFinite(courseId) || !Number.isFinite(lessonId)) {
    return err('Missing course or lesson id', 400)
  }

  const now = new Date().toISOString()
  let existing = null
  if (completed) {
    const existingUrl = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_progress`)
    existingUrl.searchParams.set('select', 'watch_count,completed,completed_at')
    existingUrl.searchParams.set('user_id', `eq.${user.id}`)
    existingUrl.searchParams.set('course_id', `eq.${courseId}`)
    existingUrl.searchParams.set('lesson_id', `eq.${lessonId}`)
    existingUrl.searchParams.set('limit', '1')
    const existingResponse = await fetch(existingUrl.toString(), {
      headers: serviceRoleHeaders(env),
    })
    const rows = await existingResponse.json().catch(() => [])
    if (!existingResponse.ok) {
      const message = rows?.message || rows?.error || 'Course progress lookup failed'
      throw new Error(message)
    }
    existing = Array.isArray(rows) ? rows[0] || null : null
  }

  const payload = {
    user_id: user.id,
    course_id: courseId,
    lesson_id: lessonId,
    current_second: currentSecond,
    last_watched_at: now,
    ...(completed ? {
      completed: true,
      completed_at: existing?.completed_at || now,
      watch_count: existing?.completed ? (existing.watch_count || 0) : ((existing?.watch_count || 0) + 1),
    } : {}),
  }

  const upsertUrl = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_progress`)
  upsertUrl.searchParams.set('on_conflict', 'user_id,course_id,lesson_id')
  const response = await fetch(upsertUrl.toString(), {
    method: 'POST',
    headers: {
      ...serviceRoleHeaders(env),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })
  const rows = await response.json().catch(() => [])
  if (!response.ok) {
    const message = rows?.message || rows?.error || 'Course progress save failed'
    throw new Error(message)
  }

  return json({
    success: true,
    progress: normalizeCourseProgressRow(Array.isArray(rows) ? rows[0] : rows),
  })
}

async function handleToken(request, videoUid, env) {
  const body           = await request.json().catch(() => ({}))
  const expiresSeconds = body.expiresInSeconds || 10800  // default 3 hours

  const token = await generateSignedToken(videoUid, expiresSeconds, env)
  return json({ success: true, token })
}

async function handleAI(request, env) {
  if (!env.OPENAI_API_KEY) {
    return err('OpenAI API key is not configured', 503)
  }

  const body = await request.json().catch(() => ({}))
  const feature = String(body.feature || '').trim()
  const input = body.input
  const userPlan = String(body.userPlan || 'free')

  if (!feature) return err('Missing AI feature', 400)

  const agent = await getAIAgent(feature, env)
  if (!agent) return err('Unsupported AI feature', 400)

  const requestBody = {
    model: env.OPENAI_MODEL || agent.model || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: agent.system_prompt,
      },
      {
        role: 'user',
        content: renderPromptTemplate(agent.user_prompt_template, { input, userPlan }),
      },
    ],
    temperature: Number(agent.temperature ?? 0.85),
  }

  if (agent.vector_store_id) {
    requestBody.tools = [
      {
        type: 'file_search',
        vector_store_ids: [agent.vector_store_id],
        max_num_results: 10,
      },
    ]
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return err(data.error?.message || 'OpenAI generation failed', response.status)
  }

  const outputText = extractOpenAIText(data)
  const result = parseAIResult(outputText)

  return json({ success: true, result, provider: 'openai', agent: agent.feature_key || feature })
}

async function handleWritingEvaluation(request, env) {
  if (!env.OPENAI_API_KEY) {
    return err('OpenAI API key is not configured', 503)
  }

  const user = await requireUser(request, env)
  const body = await request.json().catch(() => ({}))
  const feature = String(body.feature || 'script').trim()
  const topicText = String(body.topicText || '').trim()
  const scriptType = String(body.scriptType || '').trim()
  const draftText = String(body.draftText || '').trim()
  const practiceFramework = Array.isArray(body.practiceFramework) ? body.practiceFramework : []
  const userPlan = String(body.userPlan || 'free')

  if (!topicText) return err('Missing topic text', 400)
  if (!scriptType) return err('Missing script type', 400)
  if (draftText.length < 50) return err('Practice draft must be at least 50 characters', 400)

  const agent = await getAIAgent(feature, env)
  if (!agent) return err('Unsupported AI feature', 400)

  const scriptTypeMap = {
    knowledge: '教知識',
    opinion: '說觀點',
    story: '說故事',
    process: '曬過程',
  }

  const requestBody = {
    model: env.OPENAI_MODEL || agent.model || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [
          agent.system_prompt,
          '',
          '你現在進入 TOP LEVEL TRAFFIC 爆款選題腳本智能體的「練習對照模式」。',
          '這是選題、寫文案、練習對照流程的最後一步，不是把智能體定位成單純老師。',
          '請優先參考可用的 PDF 知識庫與課程腳本句式規則，判斷學員寫出的開場白是否符合該腳本類型。',
          '你只能回傳 JSON，不要輸出 Markdown，不要使用 emoji。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `學員 ID：${user.id}`,
          `學員方案：${userPlan}`,
          `選題：${topicText}`,
          `腳本類型：${scriptTypeMap[scriptType] || scriptType}`,
          practiceFramework.length ? `練習框架：${practiceFramework.join(' / ')}` : '',
          '',
          '學員練習內容：',
          draftText,
          '',
          '請用以下 JSON 格式回覆：',
          '{',
          '  "approved": true 或 false,',
          '  "score": 0 到 100 的數字,',
          '  "summary": "一句話總評",',
          '  "strengths": ["做得好的地方"],',
          '  "improvements": ["需要修改的地方"],',
          '  "matched_patterns": ["符合的 PDF/課程句式重點"],',
          '  "required_revision": "如果未通過，給一段具體修改方向；通過則填空字串"',
          '}',
          '',
          '通過標準：',
          '- 不是只看字數，必須符合該腳本類型的課程框架。',
          '- 如果是教知識，必須同時具備：場景難題、低行動成本解決方案、具體操作過程。',
          '- 如果是說觀點，必須同時具備：開篇、歸納論據或正反論證、總結觀點、金句。',
          '- 如果是說故事，必須同時具備：故事類型、成就或衝突事件、困境與轉機、感悟與收束。',
          '- 場景難題需要有明確受眾與具體卡點。',
          '- 低行動成本解決方案需要讓觀眾覺得今天就能做。',
          '- 具體操作過程需要有清楚步驟，不可只講抽象概念。',
          '- 說觀點的開篇必須是否定句或反問句，直接把原選題改成有立場的觀點。',
          '- 說觀點的論據必須合併在「歸納論據或正反論證」同一格，並標明每段文法，例如論據1（不同視角）、論據2（權衡利弊）或正面論證（維度提升）、反面論證（負面後果）。',
          '- 說觀點的總結觀點需要回扣開篇立場，金句需要可被記住、可轉發，讓對的人看完覺得爽。',
          '- 說觀點每一個文法都要是一整段，至少 3 到 5 句，不可只有一句話。',
          '- 說觀點必須白話、短句、生活化、好懂，不可像論文或報告。',
          '- 說觀點不是教育粉絲，也不是罵觀眾；必須讓受眾感覺被理解、被支持、被代言。',
          '- 說故事必須判斷腳本類型：小有成就、成功案例或平凡英雄。',
          '- 說故事必須圍繞自己達成的成就、你幫別人達成的成就，或你用價值觀解決的衝突事件；如果只是知識解析、技巧清單或泛泛心得，分數不得超過 70。',
          '- 說故事必須有困境與轉機，且困境與轉機要有畫面，不可只有抽象情緒。',
          '- 說故事的困境與轉機最好有兩輪：困難1、轉機1、困難2、轉機2。若完全沒有橋段名稱或起伏，分數不得超過 70。',
          '- 說故事必須用畫面詞代替感受詞；如果大量使用「難過、開心、辛苦」但沒有場景和動作，分數不得超過 70。',
          '- 說故事開篇必須直接進入主題，不可花大量篇幅介紹背景。',
          '- 成功案例必須同時有「你幫他的部分」與「他自己努力的部分」。',
          '- 平凡英雄必須正向收束，不可用抱怨結尾。',
          '- 必須符合信息多、效果快、料夠猛；如果只是中規中矩的論點，分數不得超過 70。',
          '- 信息多：要有清單、數字、判斷標準、對比或案例。',
          '- 效果快：要有今天可執行的小動作。',
          '- 料夠猛：要有反常識、痛點命中、踩坑提醒、真實場景或具體案例。',
          '- score 60 分以上才 approved=true。60 到 74 分代表可下載自己的文案，但仍需要在 improvements 給出具體修改建議。',
          '- 只有明顯亂碼、純數字、符號堆疊、重複拼湊、完全沒有照框架寫，才應低於 60 分或 approved=false。',
        ].join('\n'),
      },
    ],
    temperature: 0.2,
  }

  if (agent.vector_store_id) {
    requestBody.tools = [
      {
        type: 'file_search',
        vector_store_ids: [agent.vector_store_id],
        max_num_results: 8,
      },
    ]
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return err(data.error?.message || 'OpenAI evaluation failed', response.status)
  }

  const outputText = extractOpenAIText(data)
  const parsed = parseAIResult(outputText)
  const evaluation = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? parsed
    : {
        approved: false,
        score: 0,
        summary: String(outputText || 'AI did not return a valid evaluation'),
        strengths: [],
        improvements: ['請重新提交練習，讓 AI 產生完整判斷。'],
        matched_patterns: [],
        required_revision: '請補上更明確的前三秒鉤子、受眾痛點與句式結構。',
      }

  const score = Number(evaluation.score || 0)
  evaluation.score = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0
  evaluation.approved = evaluation.score >= 60

  return json({ success: true, evaluation, provider: 'openai', agent: agent.feature_key || feature })
}

async function handleAIKnowledgeSync(request, env) {
  if (!env.OPENAI_API_KEY) return err('OpenAI API key is not configured', 503)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const admin = await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  const featureKey = String(body.agentFeatureKey || body.feature_key || '').trim()
  const storagePath = String(body.storagePath || '').trim()
  const fileName = String(body.fileName || '').trim()
  const fileSize = Number(body.fileSize || 0) || null

  if (!featureKey) return err('Missing agent feature key', 400)
  if (!storagePath) return err('Missing storage path', 400)
  if (!fileName.toLowerCase().endsWith('.pdf')) return err('Only PDF knowledge files are supported', 400)

  const agent = await getAIAgent(featureKey, env)
  if (!agent) return err('AI agent not found', 404)

  let vectorStoreId = agent.vector_store_id || ''

  try {
    await upsertKnowledgeFile(env, {
      agent_feature_key: featureKey,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: 'application/pdf',
      file_size: fileSize,
      status: 'processing',
      uploaded_by: admin.id,
      error_message: null,
    })

    if (!vectorStoreId) {
      const vectorStore = await openAIJson('/v1/vector_stores', env, {
        method: 'POST',
        body: {
          name: `TOP LEVEL TRAFFIC ${featureKey} knowledge`,
        },
      })
      vectorStoreId = vectorStore.id
      await updateAgentVectorStore(env, featureKey, vectorStoreId)
    }

    const fileBlob = await downloadSupabaseStorageFile(env, storagePath)
    const openAIFile = await uploadOpenAIFile(env, fileBlob, fileName)
    const vectorFile = await openAIJson(`/v1/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, env, {
      method: 'POST',
      body: {
        file_id: openAIFile.id,
        attributes: {
          feature_key: featureKey,
          file_name: fileName,
        },
      },
    })

    const saved = await upsertKnowledgeFile(env, {
      agent_feature_key: featureKey,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: 'application/pdf',
      file_size: fileSize,
      status: 'ready',
      openai_file_id: openAIFile.id,
      vector_store_id: vectorStoreId,
      vector_store_file_id: vectorFile.id || null,
      uploaded_by: admin.id,
      error_message: null,
    })

    return json({
      success: true,
      knowledgeFile: saved,
      vectorStoreId,
      openaiFileId: openAIFile.id,
    })
  } catch (syncError) {
    await upsertKnowledgeFile(env, {
      agent_feature_key: featureKey,
      storage_path: storagePath,
      file_name: fileName || storagePath.split('/').pop(),
      mime_type: 'application/pdf',
      file_size: fileSize,
      status: 'failed',
      vector_store_id: vectorStoreId || null,
      uploaded_by: admin.id,
      error_message: syncError.message,
    }).catch(() => null)

    return err(syncError.message || 'AI knowledge sync failed', 500)
  }
}

async function handleProvisionStudent(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '').trim()
  const planId = String(body.planId || 'creator').trim()
  const legacyTier = String(body.legacyTier || planToLegacyTier(planId)).trim()
  const expiresAt = normalizeDate(body.expiresAt)

  if (!name) return err('Missing student name', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Invalid email', 400)
  if (password.length < 6) return err('Password must be at least 6 characters', 400)
  if (!['trial', 'creator', 'master', 'managed'].includes(planId)) return err('Invalid plan', 400)
  if (!['basic', 'standard', 'advanced', 'managed'].includes(legacyTier)) return err('Invalid legacy tier', 400)

  const existingProfile = await getProfileByEmail(env, email)
  let authUser = existingProfile?.id ? { id: existingProfile.id, email } : await getAuthUserByEmail(env, email)

  if (authUser?.id) {
    authUser = await updateSupabaseAuthUser(env, authUser.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
  } else {
    authUser = await createSupabaseAuthUser(env, {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
  }

  if (!authUser?.id) return err('Failed to create Supabase auth user', 500)

  await upsertProfile(env, {
    id: authUser.id,
    display_name: name,
    email,
    role: 'student',
    status: 'active',
  })

  await insertMembership(env, {
    user_id: authUser.id,
    plan_id: planId,
    legacy_tier: legacyTier,
    status: 'active',
    starts_at: new Date().toISOString(),
    expires_at: expiresAt,
  })

  return json({
    success: true,
    student: {
      id: authUser.id,
      name,
      email,
      planId,
      legacyTier,
      expiresAt,
    },
  })
}

async function handleCreateCheckoutOrder(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const phone = normalizeTaiwanMobilePhone(body.phone)
  const password = String(body.password || '').trim()
  const planId = String(body.planId || 'trial').trim()
  const legacyTier = planToLegacyTier(planId)
  const amount = PLAN_AMOUNT[planId]

  if (!name) return err('Missing customer name', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Invalid email', 400)
  if (!phone) return err('請輸入有效的台灣手機號碼（例：0912-345-678）', 400)
  if (password.length < 6) return err('Password must be at least 6 characters', 400)
  if (!amount || !['trial', 'creator', 'master'].includes(planId)) return err('Invalid checkout plan', 400)

  const existingProfile = await getProfileByEmail(env, email)
  const existingAuthUser = existingProfile?.id ? { id: existingProfile.id, email } : await getAuthUserByEmail(env, email)
  const existingOrder = await getOrderByEmail(env, email)

  if (existingProfile?.id || existingAuthUser?.id || existingOrder?.id) {
    return err('此 Email 已申請過，請直接登入或聯繫客服協助。', 409)
  }

  const authUser = await createSupabaseAuthUser(env, {
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, phone },
  })

  await upsertProfile(env, {
    id: authUser.id,
    display_name: name,
    email,
    role: 'student',
    status: 'active',
  })

  const order = await insertOrder(env, {
    order_number: makeOrderNumber(),
    user_id: authUser.id,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    plan_id: planId,
    legacy_tier: legacyTier,
    amount,
    currency: 'TWD',
    status: 'pending',
    provider: newebPayConfigured(env) ? 'newebpay' : 'manual',
    notes: 'Created from sales checkout form',
  })
  const payment = await buildNewebPayCheckout(order, env, { email, name, phone })

  return json({
    success: true,
    order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      planId: order.plan_id,
    },
    payment,
    newebpay: payment,
    message: '訂單已建立。付款確認後系統會開通學員帳號。',
  })
}

async function handleEcpayReturn(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('0|Supabase service key is not configured', { status: 503, headers: CORS })
  }

  const payload = await parseEcpayPayload(request)
  if (!(await verifyEcpayCheckMacValue(payload, env))) {
    return new Response('0|CheckMacValue Error', { status: 400, headers: CORS })
  }

  const merchantTradeNo = String(payload.MerchantTradeNo || '').trim()
  const rtnCode = String(payload.RtnCode || '').trim()
  const order = await getOrderByTradeNo(env, merchantTradeNo)
  if (!order) return new Response('0|Order Not Found', { status: 404, headers: CORS })

  if (rtnCode === '1') {
    if (order.status !== 'paid') {
      const updated = await updateOrder(env, order.id, {
        status: 'paid',
        provider: 'ecpay',
        provider_trade_no: String(payload.TradeNo || '').trim() || null,
        paid_at: normalizeDate(payload.PaymentDate) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (updated.user_id) {
        await insertMembership(env, {
          user_id: updated.user_id,
          plan_id: updated.plan_id,
          legacy_tier: updated.legacy_tier || planToLegacyTier(updated.plan_id),
          status: 'active',
          starts_at: new Date().toISOString(),
        expires_at: null,
        })
      }
    }
    return new Response('1|OK', { status: 200, headers: CORS })
  }

  await updateOrder(env, order.id, {
    provider: 'ecpay',
    provider_trade_no: String(payload.TradeNo || '').trim() || null,
    notes: `ECPay returned RtnCode=${rtnCode}, RtnMsg=${payload.RtnMsg || ''}`,
    updated_at: new Date().toISOString(),
  })
  return new Response('1|OK', { status: 200, headers: CORS })
}

async function handleEcpayResult(request, env) {
  const payload = await parseEcpayPayload(request)
  const merchantTradeNo = String(payload.MerchantTradeNo || '').trim()
  const rtnCode = String(payload.RtnCode || '').trim()
  const query = new URLSearchParams({
    order: merchantTradeNo,
    status: rtnCode === '1' ? 'paid' : 'pending',
  })
  return Response.redirect(`${getPublicBaseUrl(env)}/checkout/result?${query.toString()}`, 303)
}

async function handleNewebPayNotify(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('0|Supabase service key is not configured', { status: 503, headers: CORS })
  }

  let payload
  try {
    payload = await parseNewebPayPayload(request, env)
  } catch (error) {
    return new Response(`0|${error.message || 'NewebPay payload error'}`, { status: 400, headers: CORS })
  }

  const result = payload.Result || {}
  const merchantOrderNo = String(result.MerchantOrderNo || '').trim()
  const order = await getOrderByTradeNo(env, merchantOrderNo)
  if (!order) return new Response('0|Order Not Found', { status: 404, headers: CORS })

  if (payload.Status === 'SUCCESS') {
    if (order.status !== 'paid') {
      const updated = await updateOrder(env, order.id, {
        status: 'paid',
        provider: 'newebpay',
        provider_trade_no: String(result.TradeNo || '').trim() || null,
        paid_at: normalizeDate(result.PayTime) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (updated.user_id) {
        await insertMembership(env, {
          user_id: updated.user_id,
          plan_id: updated.plan_id,
          legacy_tier: updated.legacy_tier || planToLegacyTier(updated.plan_id),
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: null,
        })
      }
    }
    return new Response('1|OK', { status: 200, headers: CORS })
  }

  await updateOrder(env, order.id, {
    provider: 'newebpay',
    provider_trade_no: String(result.TradeNo || '').trim() || null,
    notes: `NewebPay returned Status=${payload.Status}, Message=${payload.Message || ''}`,
    updated_at: new Date().toISOString(),
  })
  return new Response('1|OK', { status: 200, headers: CORS })
}

async function handleNewebPayResult(request, env) {
  let payload = {}
  try {
    payload = await parseNewebPayPayload(request, env)
  } catch (_) {
    payload = {}
  }
  const result = payload.Result || {}
  const merchantOrderNo = String(result.MerchantOrderNo || '').trim()
  const query = new URLSearchParams({
    order: merchantOrderNo,
    status: payload.Status === 'SUCCESS' ? 'paid' : 'pending',
  })
  return Response.redirect(`${getPublicBaseUrl(env)}/checkout/result?${query.toString()}`, 303)
}

async function handleListOrders(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  const orders = await listOrders(env)
  return json({ success: true, orders: orders.map(mapOrder) })
}

async function handleUpdateOrder(request, orderId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return err('Invalid order id', 400)

  const body = await request.json().catch(() => ({}))
  const status = String(body.status || '').trim()
  if (!['paid', 'cancelled', 'pending'].includes(status)) return err('Invalid order status', 400)

  const currentOrder = await getOrderById(env, orderId)
  if (!currentOrder) return err('Order not found', 404)

  const updatePayload = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'paid') {
    updatePayload.paid_at = currentOrder.paid_at || new Date().toISOString()
    updatePayload.provider_trade_no = String(body.providerTradeNo || currentOrder.provider_trade_no || '').trim() || null
  }

  const order = await updateOrder(env, orderId, updatePayload)

  if (status === 'paid' && order.user_id) {
    await insertMembership(env, {
      user_id: order.user_id,
      plan_id: order.plan_id,
      legacy_tier: order.legacy_tier || planToLegacyTier(order.plan_id),
      status: 'active',
      starts_at: new Date().toISOString(),
      expires_at: null,
    })
  }

  return json({ success: true, order: mapOrder(order) })
}

async function handleDeleteOrder(request, orderId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return err('Invalid order id', 400)

  const order = await getOrderById(env, orderId)
  if (!order) return err('Order not found', 404)

  await deleteOrder(env, orderId)
  return json({
    success: true,
    deletedId: orderId,
    deletedOrderNumber: order.order_number,
  })
}

async function handleListStudents(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  const profiles = await listStudentProfiles(env)
  const memberships = await listLatestActiveMemberships(env, profiles.map(profile => profile.id))
  const membershipByUserId = Object.fromEntries(memberships.map(item => [item.user_id, item]))
  const authUsers = await listAuthUsers(env).catch(error => {
    console.error('Failed to list auth users for last login:', error)
    return []
  })
  const authUserById = Object.fromEntries(authUsers.map(user => [user.id, user]))

  return json({
    success: true,
    students: profiles.map(profile => {
      const membership = membershipByUserId[profile.id] || null
      const authUser = authUserById[profile.id] || null
      const name = profile.display_name || profile.email?.split('@')[0] || '學員'
      return {
        id: profile.id,
        name,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        avatar: name.charAt(0),
        createdAt: profile.created_at || null,
        lastLoginAt: authUser?.last_sign_in_at || profile.last_login_at || null,
        planId: membership?.plan_id || null,
        legacyTier: membership?.legacy_tier || null,
        tier: membership?.plan_id ? planToLegacyTier(membership.plan_id) : membership?.legacy_tier || 'basic',
        expiresAt: membership?.expires_at || null,
        trialCompletedAt: membership?.trial_completed_at || null,
        source: 'supabase',
      }
    }),
  })
}

async function handleLearningProgress(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)

  const [catalog, profiles, progressRows, reminderRows] = await Promise.all([
    getCourseCatalog(env),
    listStudentProfiles(env),
    listCourseProgressRows(env),
    listLearningReminderRows(env),
  ])
  const memberships = await listLatestActiveMemberships(env, profiles.map(profile => profile.id))
  const membershipByUserId = Object.fromEntries(memberships.map(item => [item.user_id, item]))
  const reminderByUserId = new Map()
  for (const reminder of reminderRows) {
    if (!reminderByUserId.has(reminder.user_id)) reminderByUserId.set(reminder.user_id, reminder)
  }

  const courses = catalog.courses || []
  const courseById = Object.fromEntries(courses.map(course => [Number(course.id), course]))
  const progressByUser = progressRows.reduce((acc, row) => {
    const key = row.user_id
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const students = profiles
    .filter(profile => profile.role === 'student')
    .map(profile => {
      const membership = membershipByUserId[profile.id] || null
      const tier = membership?.plan_id ? planToLegacyTier(membership.plan_id) : membership?.legacy_tier || 'basic'
      const rows = progressByUser[profile.id] || []
      const visibleCourses = courses.filter(course => {
        const accessLevels = getCourseAccessLevels(course)
        return accessLevels.map(courseAccessLevelToTier).includes(tier)
      })
      const visibleCourseIds = new Set(visibleCourses.map(course => Number(course.id)))
      const visibleRows = rows.filter(row => visibleCourseIds.has(Number(row.course_id)))
      const totalLessons = visibleCourses.reduce((sum, course) => sum + (Array.isArray(course.lessons) ? course.lessons.length : 0), 0)
      const completedLessons = visibleRows.filter(row => row.completed).length
      const latestRow = visibleRows
        .slice()
        .sort((a, b) => new Date(b.updated_at || b.completed_at || 0) - new Date(a.updated_at || a.completed_at || 0))[0] || null
      const latestCourse = latestRow ? courseById[Number(latestRow.course_id)] : null
      const latestLesson = latestCourse?.lessons?.find(lesson => Number(lesson.id) === Number(latestRow.lesson_id)) || null
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      const name = profile.display_name || profile.email?.split('@')[0] || '學員'

      return {
        id: profile.id,
        name,
        email: profile.email,
        status: profile.status,
        tier,
        planId: membership?.plan_id || null,
        totalLessons,
        completedLessons,
        percent,
        latestCourseTitle: latestCourse?.title || null,
        latestLessonTitle: latestLesson?.title || null,
        latestSecond: latestRow?.current_second || 0,
        latestUpdatedAt: latestRow?.updated_at || latestRow?.completed_at || null,
        lastReminderAt: reminderByUserId.get(profile.id)?.created_at || null,
        progress: visibleRows.map(row => {
          const course = courseById[Number(row.course_id)]
          const lesson = course?.lessons?.find(item => Number(item.id) === Number(row.lesson_id))
          return {
            courseId: row.course_id,
            courseTitle: course?.title || `課程 ${row.course_id}`,
            lessonId: row.lesson_id,
            lessonTitle: lesson?.title || `第 ${row.lesson_id} 堂`,
            currentSecond: row.current_second || 0,
            completed: !!row.completed,
            completedAt: row.completed_at || null,
            updatedAt: row.updated_at || null,
          }
        }),
      }
    })

  return json({ success: true, students, courses })
}

async function handleSendLearningReminders(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const admin = await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  const userIds = Array.isArray(body.userIds) ? body.userIds.map(id => String(id)).filter(Boolean) : []
  const message = String(body.message || '').trim()
  const courseId = body.courseId ? Number(body.courseId) : null

  if (userIds.length === 0) return err('Missing reminder recipients', 400)
  if (!message) return err('Missing reminder message', 400)

  const rows = userIds.map(userId => ({
    admin_id: admin.id,
    user_id: userId,
    course_id: Number.isFinite(courseId) ? courseId : null,
    channel: 'internal',
    message,
    created_at: new Date().toISOString(),
  }))

  const inserted = await insertLearningReminders(env, rows)
  return json({ success: true, count: inserted.length, reminders: inserted })
}

async function handleResetStudentPassword(request, userId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return err('Invalid user id', 400)

  const body = await request.json().catch(() => ({}))
  const password = String(body.password || '').trim()
  if (password.length < 6) return err('Password must be at least 6 characters', 400)

  await updateSupabaseAuthUser(env, userId, { password })
  return json({ success: true, userId })
}

async function handleStartMembership(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const user = await requireUser(request, env)
  const membership = await getLatestActiveMembership(env, user.id)
  if (!membership) return err('Active membership not found', 404)

  if (membership.expires_at) {
    return json({
      success: true,
      membership: {
        planId: membership.plan_id,
        legacyTier: membership.legacy_tier,
        startsAt: membership.starts_at,
        expiresAt: membership.expires_at,
        trialCompletedAt: membership.trial_completed_at || null,
      },
    })
  }

  const days = PLAN_DURATION_DAYS[membership.plan_id]
  if (!days) {
    return json({
      success: true,
      membership: {
        planId: membership.plan_id,
        legacyTier: membership.legacy_tier,
        startsAt: membership.starts_at,
        expiresAt: null,
        trialCompletedAt: membership.trial_completed_at || null,
      },
    })
  }

  const startsAt = new Date()
  const expiresAt = new Date(startsAt)
  expiresAt.setDate(expiresAt.getDate() + days)

  const updated = await updateMembershipById(env, membership.id, {
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    updated_at: startsAt.toISOString(),
  })

  return json({
    success: true,
    membership: {
      planId: updated.plan_id,
      legacyTier: updated.legacy_tier,
      startsAt: updated.starts_at,
      expiresAt: updated.expires_at,
      trialCompletedAt: updated.trial_completed_at || null,
    },
  })
}

async function handleRecordLastLogin(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const user = await requireUser(request, env)
  const now = new Date().toISOString()

  try {
    await updateProfile(env, user.id, {
      last_login_at: now,
      updated_at: now,
    })
  } catch (error) {
    if (isMissingColumn(error, 'last_login_at')) {
      return json({ success: true, lastLoginAt: null, warning: 'last_login_at column is not migrated yet' })
    }
    throw error
  }

  return json({ success: true, lastLoginAt: now })
}

async function handleUpdateStudent(request, userId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return err('Invalid student id', 400)

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  const status = String(body.status || '').trim()
  const tier = String(body.tier || '').trim()
  const planId = String(body.planId || tierToPlanId(tier) || '').trim()
  const expiresAt = body.expiresAt === '' ? null : normalizeDate(body.expiresAt)

  if (name || status) {
    const profilePayload = {}
    if (name) profilePayload.display_name = name
    if (status) {
      if (!['active', 'inactive'].includes(status)) return err('Invalid status', 400)
      profilePayload.status = status
    }
    await updateProfile(env, userId, profilePayload)
  }

  if (planId) {
    if (!['trial', 'creator', 'master', 'managed'].includes(planId)) return err('Invalid plan', 400)
    const legacyTier = String(body.legacyTier || planToLegacyTier(planId)).trim()
    if (!['basic', 'standard', 'advanced', 'managed'].includes(legacyTier)) return err('Invalid legacy tier', 400)

    await insertMembership(env, {
      user_id: userId,
      plan_id: planId,
      legacy_tier: legacyTier,
      status: 'active',
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
  }

  const profile = await getProfileById(env, userId)
  const memberships = await listLatestActiveMemberships(env, [userId])
  const membership = memberships[0] || null
  const displayName = profile.display_name || profile.email?.split('@')[0] || '學員'

  return json({
    success: true,
    student: {
      id: userId,
      name: displayName,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      avatar: displayName.charAt(0),
      createdAt: profile.created_at || null,
      planId: membership?.plan_id || null,
      legacyTier: membership?.legacy_tier || null,
      tier: membership?.plan_id ? planToLegacyTier(membership.plan_id) : membership?.legacy_tier || 'basic',
      expiresAt: membership?.expires_at || null,
      trialCompletedAt: membership?.trial_completed_at || null,
      source: 'supabase',
    },
  })
}

async function handleDeleteStudent(request, userId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return err('Invalid student id', 400)

  const profile = await getProfileById(env, userId)
  if (profile.role !== 'student') return err('Only student accounts can be deleted here', 400)

  await deleteMembershipsForUser(env, userId)
  await deleteProfile(env, userId)
  await deleteSupabaseAuthUser(env, userId)

  return json({
    success: true,
    deletedId: userId,
    deletedEmail: profile.email,
  })
}

async function getAIAgent(feature, env) {
  if (!feature) return null
  const fallback = DEFAULT_AI_AGENTS[feature] || null
  const key = env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!env.SUPABASE_URL || !key) return ensureAgentRules(fallback)

  try {
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_agents`)
    url.searchParams.set('feature_key', `eq.${feature}`)
    url.searchParams.set('enabled', 'eq.true')
    url.searchParams.set('select', 'feature_key,name,system_prompt,user_prompt_template,model,temperature,vector_store_id,required_plan')
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    const data = await response.json().catch(() => [])
    if (!response.ok) return ensureAgentRules(fallback)
    return ensureAgentRules(Array.isArray(data) && data[0] ? data[0] : fallback)
  } catch (_) {
    return ensureAgentRules(fallback)
  }
}

async function downloadSupabaseStorageFile(env, storagePath) {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${AI_KNOWLEDGE_BUCKET}/${encodedPath}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Failed to read PDF from Supabase Storage')
  }

  return await response.blob()
}

async function uploadOpenAIFile(env, fileBlob, fileName) {
  const form = new FormData()
  form.append('purpose', 'assistants')
  form.append('file', fileBlob, fileName)

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: form,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI file upload failed')
  }
  return data
}

async function openAIJson(path, env, options = {}) {
  const response = await fetch(`https://api.openai.com${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI request failed')
  }
  return data
}

async function updateAgentVectorStore(env, featureKey, vectorStoreId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_agents`)
  url.searchParams.set('feature_key', `eq.${featureKey}`)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      vector_store_id: vectorStoreId,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Failed to update agent vector store')
  }
}

async function upsertKnowledgeFile(env, payload) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_knowledge_files`)
  url.searchParams.set('on_conflict', 'storage_path')

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new Error(data.message || 'Failed to save knowledge file metadata')
  }
  return Array.isArray(data) ? data[0] : data
}

function planToLegacyTier(planId) {
  return PLAN_TO_LEGACY_TIER[planId] || 'standard'
}

function tierToPlanId(tier) {
  const entry = Object.entries(PLAN_TO_LEGACY_TIER).find(([, legacyTier]) => legacyTier === tier)
  return entry ? entry[0] : ''
}

function normalizeDate(value) {
  if (!value) return null
  const text = String(value).trim()
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T23:59:59${TAIPEI_OFFSET}`

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function defaultMembershipExpiry(planId) {
  const days = PLAN_DURATION_DAYS[planId]
  if (!days) return null

  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function makeOrderNumber() {
  const time = Date.now().toString(36).toUpperCase()
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `TLT${time}${random}`.slice(0, 20)
}

function mapOrder(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    userId: order.user_id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    planId: order.plan_id,
    legacyTier: order.legacy_tier,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    provider: order.provider,
    providerTradeNo: order.provider_trade_no,
    paidAt: order.paid_at,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }
}

function newebPayConfigured(env) {
  return Boolean(env.NEWEBPAY_MERCHANT_ID && env.NEWEBPAY_HASH_KEY && env.NEWEBPAY_HASH_IV)
}

function getNewebPayAction(env) {
  if (env.NEWEBPAY_CHECKOUT_URL) return env.NEWEBPAY_CHECKOUT_URL
  return String(env.NEWEBPAY_ENV || 'stage').toLowerCase() === 'production' ? NEWEBPAY_PROD_URL : NEWEBPAY_STAGE_URL
}

async function buildNewebPayCheckout(order, env, customer = {}) {
  if (!newebPayConfigured(env)) {
    return {
      configured: false,
      provider: 'newebpay',
      message: 'NewebPay secrets are not configured. Set NEWEBPAY_MERCHANT_ID, NEWEBPAY_HASH_KEY, and NEWEBPAY_HASH_IV.',
    }
  }

  const tradeData = {
    MerchantID: env.NEWEBPAY_MERCHANT_ID,
    RespondType: 'JSON',
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    Version: NEWEBPAY_VERSION,
    MerchantOrderNo: order.order_number,
    Amt: String(order.amount),
    ItemDesc: planItemName(order.plan_id),
    Email: customer.email || order.customer_email || '',
    LoginType: '0',
    NotifyURL: `${getWorkerBaseUrl(env)}/api/newebpay/notify`,
    ReturnURL: `${getWorkerBaseUrl(env)}/api/newebpay/result`,
    ClientBackURL: getPublicBaseUrl(env),
    CREDIT: '1',
  }

  const tradeInfo = await makeNewebPayTradeInfo(tradeData, env)
  const tradeSha = await makeNewebPayTradeSha(tradeInfo, env)

  return {
    configured: true,
    provider: 'newebpay',
    action: getNewebPayAction(env),
    method: 'POST',
    params: {
      MerchantID: env.NEWEBPAY_MERCHANT_ID,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: NEWEBPAY_VERSION,
    },
  }
}

async function makeNewebPayTradeInfo(data, env) {
  const source = new URLSearchParams(data).toString()
  return aes256CbcEncryptHex(source, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV)
}

async function makeNewebPayTradeSha(tradeInfo, env) {
  return (await sha256Hex(`HashKey=${env.NEWEBPAY_HASH_KEY}&${tradeInfo}&HashIV=${env.NEWEBPAY_HASH_IV}`)).toUpperCase()
}

async function parseNewebPayPayload(request, env) {
  if (!newebPayConfigured(env)) throw new Error('NewebPay secrets are not configured')
  const form = await parseEcpayPayload(request)
  const tradeInfo = String(form.TradeInfo || '').trim()
  if (!tradeInfo) throw new Error('Missing TradeInfo')

  const expectedSha = await makeNewebPayTradeSha(tradeInfo, env)
  const receivedSha = String(form.TradeSha || '').trim().toUpperCase()
  if (receivedSha && receivedSha !== expectedSha) throw new Error('TradeSha Error')

  const decrypted = await aes256CbcDecryptHex(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV)
  return JSON.parse(decrypted)
}

async function aes256CbcEncryptHex(text, key, iv) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: new TextEncoder().encode(iv) },
    cryptoKey,
    pkcs7Pad(new TextEncoder().encode(text), 16),
  )
  return [...new Uint8Array(encrypted)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function aes256CbcDecryptHex(hex, key, iv) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  )
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: new TextEncoder().encode(iv) },
    cryptoKey,
    bytes,
  )
  const unpadded = pkcs7Unpad(new Uint8Array(decrypted))
  return new TextDecoder().decode(unpadded)
}

function pkcs7Pad(bytes, blockSize) {
  const remainder = bytes.length % blockSize
  const pad = remainder === 0 ? blockSize : blockSize - remainder
  const output = new Uint8Array(bytes.length + pad)
  output.set(bytes)
  output.fill(pad, bytes.length)
  return output
}

function pkcs7Unpad(bytes) {
  const pad = bytes[bytes.length - 1]
  if (!pad || pad > 16) return bytes
  return bytes.slice(0, bytes.length - pad)
}

function ecpayConfigured(env) {
  return Boolean(env.ECPAY_MERCHANT_ID && env.ECPAY_HASH_KEY && env.ECPAY_HASH_IV)
}

function getEcpayAction(env) {
  if (env.ECPAY_CHECKOUT_URL) return env.ECPAY_CHECKOUT_URL
  return String(env.ECPAY_ENV || 'stage').toLowerCase() === 'production' ? ECPAY_PROD_URL : ECPAY_STAGE_URL
}

function getPublicBaseUrl(env) {
  return String(env.PUBLIC_APP_URL || 'https://media-platform-orcin.vercel.app').replace(/\/$/, '')
}

function getWorkerBaseUrl(env) {
  return String(env.WORKER_PUBLIC_URL || 'https://media-platform-api.allen-a76.workers.dev').replace(/\/$/, '')
}

function formatEcpayDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type) => parts.find(part => part.type === type)?.value || '00'
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

async function buildEcpayCheckout(order, env) {
  if (!ecpayConfigured(env)) {
    return {
      configured: false,
      message: 'ECPay secrets are not configured. Order remains pending for manual confirmation.',
    }
  }

  const params = {
    MerchantID: env.ECPAY_MERCHANT_ID,
    MerchantTradeNo: order.order_number,
    MerchantTradeDate: formatEcpayDate(),
    PaymentType: 'aio',
    TotalAmount: String(order.amount),
    TradeDesc: 'TOP LEVEL TRAFFIC course checkout',
    ItemName: planItemName(order.plan_id),
    ReturnURL: `${getWorkerBaseUrl(env)}/api/ecpay/return`,
    OrderResultURL: `${getWorkerBaseUrl(env)}/api/ecpay/result`,
    ClientBackURL: getPublicBaseUrl(env),
    ChoosePayment: env.ECPAY_CHOOSE_PAYMENT || 'Credit',
    EncryptType: '1',
  }

  params.CheckMacValue = await makeEcpayCheckMacValue(params, env)

  return {
    configured: true,
    action: getEcpayAction(env),
    method: 'POST',
    params,
  }
}

function planItemName(planId) {
  if (planId === 'trial') return '自媒體獲客-定位體驗課'
  if (planId === 'creator') return '頂流達人'
  if (planId === 'master') return '頂流私塾'
  return 'TOP LEVEL TRAFFIC'
}

async function makeEcpayCheckMacValue(params, env) {
  const source = Object.entries(params)
    .filter(([key]) => key !== 'CheckMacValue')
    .sort(([a], [b]) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const raw = `HashKey=${env.ECPAY_HASH_KEY}&${source}&HashIV=${env.ECPAY_HASH_IV}`
  return (await sha256Hex(ecpayUrlEncode(raw).toLowerCase())).toUpperCase()
}

function ecpayUrlEncode(value) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%2D/gi, '-')
    .replace(/%5F/gi, '_')
    .replace(/%2E/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2A/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function parseEcpayPayload(request) {
  const contentType = request.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    return await request.json().catch(() => ({}))
  }

  const text = await request.text()
  const params = new URLSearchParams(text)
  return Object.fromEntries(params.entries())
}

async function verifyEcpayCheckMacValue(payload, env) {
  if (!ecpayConfigured(env)) return false
  const expected = String(payload.CheckMacValue || '').trim().toUpperCase()
  if (!expected) return false
  const actual = await makeEcpayCheckMacValue(payload, env)
  return actual === expected
}

function supabaseServiceHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  }
}

async function getProfileByEmail(env, email) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('email', `eq.${email}`)
  url.searchParams.set('select', 'id,email')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new Error(data.message || 'Failed to find student profile')
  }
  return Array.isArray(data) ? data[0] || null : null
}

async function getProfileById(env, userId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('id', `eq.${userId}`)
  url.searchParams.set('select', 'id,display_name,email,role,status,created_at')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || 'Failed to find student profile')
  const profile = Array.isArray(data) ? data[0] : null
  if (!profile) throw new Error('Student profile not found')
  return profile
}

async function listStudentProfiles(env) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('role', 'eq.student')
  url.searchParams.set('select', 'id,display_name,email,role,status,created_at,last_login_at')
  url.searchParams.set('order', 'created_at.desc')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingColumn(data, 'last_login_at')) return await listStudentProfilesWithoutLastLogin(env)
    throw new Error(data.message || 'Failed to list student profiles')
  }
  return Array.isArray(data) ? data : []
}

async function listStudentProfilesWithoutLastLogin(env) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('role', 'eq.student')
  url.searchParams.set('select', 'id,display_name,email,role,status,created_at')
  url.searchParams.set('order', 'created_at.desc')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || 'Failed to list student profiles')
  return (Array.isArray(data) ? data : []).map(profile => ({ ...profile, last_login_at: null }))
}

async function listLatestActiveMemberships(env, userIds) {
  if (!userIds.length) return []

  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/memberships`)
  url.searchParams.set('user_id', `in.(${userIds.join(',')})`)
  url.searchParams.set('status', 'eq.active')
  url.searchParams.set('select', 'user_id,plan_id,legacy_tier,status,starts_at,expires_at,trial_completed_at')
  url.searchParams.set('order', 'starts_at.desc')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || 'Failed to list student memberships')

  const latest = new Map()
  for (const membership of Array.isArray(data) ? data : []) {
    if (!latest.has(membership.user_id)) latest.set(membership.user_id, membership)
  }
  return [...latest.values()]
}

async function getLatestActiveMembership(env, userId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/memberships`)
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('status', 'eq.active')
  url.searchParams.set('select', 'id,user_id,plan_id,legacy_tier,status,starts_at,expires_at,trial_completed_at')
  url.searchParams.set('order', 'starts_at.desc')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || 'Failed to load active membership')
  return Array.isArray(data) ? data[0] || null : null
}

async function updateMembershipById(env, membershipId, payload) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/memberships`)
  url.searchParams.set('id', `eq.${membershipId}`)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || 'Failed to update membership')
  return Array.isArray(data) ? data[0] : data
}

async function getAuthUserByEmail(env, email) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`)
  url.searchParams.set('page', '1')
  url.searchParams.set('per_page', '1000')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.msg || data.message || 'Failed to list Supabase auth users')
  }

  const users = Array.isArray(data) ? data : data.users || []
  return users.find(user => String(user.email || '').toLowerCase() === email) || null
}

async function listAuthUsers(env) {
  const users = []
  let page = 1
  const perPage = 1000

  while (page <= 10) {
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', String(perPage))

    const response = await fetch(url.toString(), {
      headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.msg || data.message || 'Failed to list Supabase auth users')

    const batch = Array.isArray(data) ? data : data.users || []
    users.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }

  return users
}

async function listCourseProgressRows(env) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_progress`)
  url.searchParams.set('select', 'user_id,course_id,lesson_id,current_second,completed,completed_at,watch_count,updated_at')
  url.searchParams.set('order', 'updated_at.desc')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to list course progress')
  return Array.isArray(data) ? data : []
}

async function listLearningReminderRows(env) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/learning_reminders`)
  url.searchParams.set('select', 'id,user_id,course_id,message,channel,created_at')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '1000')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to list learning reminders')
  return Array.isArray(data) ? data : []
}

async function insertLearningReminders(env, rows) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/learning_reminders`, {
    method: 'POST',
    headers: {
      ...supabaseServiceHeaders(env, {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data.message || data.error || 'Failed to insert learning reminders')
  return Array.isArray(data) ? data : []
}

async function createSupabaseAuthUser(env, payload) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.msg || data.message || 'Failed to create Supabase auth user')
  }
  return data
}

async function updateSupabaseAuthUser(env, userId, payload) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.msg || data.message || 'Failed to update Supabase auth user')
  }
  return data
}

async function deleteSupabaseAuthUser(env, userId) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok && response.status !== 404) {
    throw new Error(data.msg || data.message || 'Failed to delete Supabase auth user')
  }
  return data
}

async function upsertProfile(env, payload) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('on_conflict', 'id')

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new Error(data.message || 'Failed to save student profile')
  }
  return Array.isArray(data) ? data[0] : data
}

async function updateProfile(env, userId, payload) {
  if (!Object.keys(payload).length) return null

  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('id', `eq.${userId}`)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update student profile')
  }
  return Array.isArray(data) ? data[0] : data
}

async function deleteProfile(env, userId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  url.searchParams.set('id', `eq.${userId}`)

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: supabaseServiceHeaders(env, { Prefer: 'return=minimal' }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to delete student profile')
  }
}

async function deleteMembershipsForUser(env, userId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/memberships`)
  url.searchParams.set('user_id', `eq.${userId}`)

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: supabaseServiceHeaders(env, { Prefer: 'return=minimal' }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to delete student memberships')
  }
}

async function insertOrder(env, payload) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`, {
    method: 'POST',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingOrdersTable(data)) {
      throw new Error('訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。')
    }
    throw new Error(data.message || 'Failed to create order')
  }
  return Array.isArray(data) ? data[0] : data
}

async function listOrders(env) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`)
  url.searchParams.set('select', 'id,order_number,user_id,customer_name,customer_email,customer_phone,plan_id,legacy_tier,amount,currency,status,provider,provider_trade_no,paid_at,notes,created_at,updated_at')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '200')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingOrdersTable(data)) {
      throw new Error('訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。')
    }
    throw new Error(data.message || 'Failed to list orders')
  }
  return Array.isArray(data) ? data : []
}

async function getOrderById(env, orderId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`)
  url.searchParams.set('id', `eq.${orderId}`)
  url.searchParams.set('select', 'id,order_number,user_id,customer_name,customer_email,customer_phone,plan_id,legacy_tier,amount,currency,status,provider,provider_trade_no,paid_at,notes,created_at,updated_at')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingOrdersTable(data)) {
      throw new Error('訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。')
    }
    throw new Error(data.message || 'Failed to read order')
  }
  return Array.isArray(data) ? data[0] || null : null
}

async function getOrderByTradeNo(env, merchantTradeNo) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`)
  url.searchParams.set('order_number', `eq.${merchantTradeNo}`)
  url.searchParams.set('select', 'id,order_number,user_id,customer_name,customer_email,customer_phone,plan_id,legacy_tier,amount,currency,status,provider,provider_trade_no,paid_at,notes,created_at,updated_at')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingOrdersTable(data)) {
      throw new Error('訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。')
    }
    throw new Error(data.message || 'Failed to read order')
  }
  return Array.isArray(data) ? data[0] || null : null
}

async function getOrderByEmail(env, email) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`)
  url.searchParams.set('customer_email', `eq.${email}`)
  url.searchParams.set('select', 'id,order_number,user_id,customer_name,customer_email,customer_phone,plan_id,legacy_tier,amount,currency,status,provider,provider_trade_no,paid_at,notes,created_at,updated_at')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingOrdersTable(data)) return null
    throw new Error(data.message || 'Failed to read order by email')
  }
  return Array.isArray(data) ? data[0] || null : null
}

async function updateOrder(env, orderId, payload) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`)
  url.searchParams.set('id', `eq.${orderId}`)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingOrdersTable(data)) {
      throw new Error('訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。')
    }
    throw new Error(data.message || 'Failed to update order')
  }
  return Array.isArray(data) ? data[0] : data
}

async function deleteOrder(env, orderId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`)
  url.searchParams.set('id', `eq.${orderId}`)

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: supabaseServiceHeaders(env, { Prefer: 'return=minimal' }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (isMissingOrdersTable(data)) {
      throw new Error('訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。')
    }
    throw new Error(data.message || 'Failed to delete order')
  }
}

function normalizeTaiwanMobilePhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+886')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('886')) digits = `0${digits.slice(3)}`
  digits = digits.replace(/\D/g, '')
  return /^09\d{8}$/.test(digits) ? digits : ''
}

function isMissingOrdersTable(data) {
  const message = String(data?.message || data?.error || '')
  return data?.code === 'PGRST205' || message.includes("public.orders") || message.includes("'orders'")
}

function isMissingColumn(data, column) {
  const message = String(data?.message || data?.error || data || '')
  return data?.code === 'PGRST204' || message.includes(column)
}

async function insertMembership(env, payload) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/memberships`, {
    method: 'POST',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new Error(data.message || 'Failed to open student membership')
  }
  return Array.isArray(data) ? data[0] : data
}

function renderPromptTemplate(template, vars) {
  const inputText = typeof vars.input === 'string'
    ? vars.input
    : JSON.stringify(vars.input || {}, null, 2)

  return String(template || '')
    .replaceAll('{{input}}', inputText || '健身')
    .replaceAll('{{input_json}}', JSON.stringify(vars.input || {}))
    .replaceAll('{{userPlan}}', vars.userPlan || 'free')
}

function extractOpenAIText(data) {
  if (typeof data.output_text === 'string') return data.output_text

  const parts = []
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('\n').trim()
}

function parseAIResult(outputText) {
  const text = String(outputText || '').trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (_) {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch (_) {
        return text
      }
    }
    return text
  }
}

async function handleCalendarAvailability(url, env) {
  const date = url.searchParams.get('date')
  const durationMinutes = getRequestedDurationMinutes(url.searchParams.get('durationMinutes'))
  const excludeEventId = url.searchParams.get('excludeEventId') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return err('Invalid date', 400)
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_CALENDAR_ID) {
    return json({ success: true, calendarConfigured: false, unavailableSlots: [] })
  }

  const token = await getGoogleAccessToken(env)
  const busy = await getGoogleBusyRanges(date, token, env, excludeEventId)
  const unavailableSlots = BOOKING_TIME_SLOTS.filter(slot => {
    const range = getSlotRange(date, slot, durationMinutes)
    return busy.some(item => rangesOverlap(range.start, range.end, new Date(item.start), new Date(item.end)))
  })

  return json({ success: true, calendarConfigured: true, unavailableSlots })
}

async function handleCreateCalendarEvent(request, env) {
  await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  validateCalendarEventBody(body)

  const token = await getGoogleAccessToken(env)
  const event = buildBookingCalendarEvent(body)
  const created = await googleCalendarFetch(env, token, '', 'POST', event)

  return json({
    success: true,
    eventId: created.id,
    htmlLink: created.htmlLink || null,
  })
}

async function handleUpdateCalendarEvent(request, eventId, env) {
  await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  validateCalendarEventBody(body)

  const token = await getGoogleAccessToken(env)
  const event = buildBookingCalendarEvent(body)
  const updated = await googleCalendarFetch(env, token, `/${encodeURIComponent(eventId)}`, 'PATCH', event)

  return json({
    success: true,
    eventId: updated.id,
    htmlLink: updated.htmlLink || null,
  })
}

async function handleDeleteCalendarEvent(request, eventId, env) {
  await requireAdmin(request, env)
  const token = await getGoogleAccessToken(env)
  await googleCalendarFetch(env, token, `/${encodeURIComponent(eventId)}`, 'DELETE')
  return json({ success: true })
}

// ── Cloudflare API helper ─────────────────────────────────────────────────

async function cfFetch(path, method, env, body) {
  // path is relative to /client/v4, e.g. "/accounts/{id}/stream"
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!text) return { success: res.ok, result: null, errors: [], messages: [] }
  return JSON.parse(text)
}

function base64Encode(value) {
  const bytes = new TextEncoder().encode(String(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const assertion = await signJwt(header, payload, normalizePem(env.GOOGLE_PRIVATE_KEY))

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google auth failed')
  return data.access_token
}

async function getCourseCatalog(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { courses: [], cfVideos: [], videoAssignments: {} }
  }

  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_catalog`)
  url.searchParams.set('id', 'eq.main')
  url.searchParams.set('select', 'courses,cf_videos,video_assignments,updated_at')

  const response = await fetch(url.toString(), {
    headers: serviceRoleHeaders(env),
  })
  const rows = await response.json().catch(() => [])
  if (!response.ok) {
    const message = rows?.message || rows?.error || 'Course catalog read failed'
    if (message.includes('course_catalog') || message.includes('schema cache')) {
      throw new Error('Course catalog table missing. Run the Supabase migration first.')
    }
    throw new Error(message)
  }
  const row = Array.isArray(rows) ? rows[0] : null

  const courses = Array.isArray(row?.courses) ? row.courses : []

  return {
    courses: await withCourseStudentCounts(env, courses),
    cfVideos: Array.isArray(row?.cf_videos) ? row.cf_videos : [],
    videoAssignments: row?.video_assignments && typeof row.video_assignments === 'object' ? row.video_assignments : {},
    updatedAt: row?.updated_at || null,
  }
}

async function withCourseStudentCounts(env, courses) {
  try {
    const profiles = await listStudentProfiles(env)
    const memberships = await listLatestActiveMemberships(env, profiles.map(profile => profile.id))
    const profileById = Object.fromEntries(profiles.map(profile => [profile.id, profile]))
    const students = memberships
      .map(membership => ({
        profile: profileById[membership.user_id],
        tier: membership.plan_id ? planToLegacyTier(membership.plan_id) : membership.legacy_tier || 'basic',
      }))
      .filter(item => item.profile?.status !== 'inactive' && item.tier !== 'managed')

    return courses.map(course => {
      const accessLevels = getCourseAccessLevels(course)
      const allowedTiers = accessLevels.map(courseAccessLevelToTier).filter(Boolean)
      return {
        ...course,
        students: students.filter(student => allowedTiers.includes(student.tier)).length,
      }
    })
  } catch (error) {
    console.error('Course student count enrichment failed:', error)
    return courses
  }
}

function getCourseAccessLevels(course = {}) {
  if (Array.isArray(course.accessLevels) && course.accessLevels.length > 0) return course.accessLevels
  const order = ['trial', 'standard', 'advanced']
  const legacyAccess = course.accessLevel || ({ basic: 'trial', standard: 'standard', advanced: 'advanced' }[course.tier]) || 'standard'
  const startIndex = order.indexOf(legacyAccess)
  return startIndex >= 0 ? order.slice(startIndex) : [legacyAccess]
}

function courseAccessLevelToTier(accessLevel) {
  return { trial: 'basic', standard: 'standard', advanced: 'advanced' }[accessLevel] || ''
}

async function upsertCourseCatalog(env, catalog) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service key is not configured')
  }

  const payload = {
    id: 'main',
    courses: catalog.courses,
    cf_videos: catalog.cfVideos,
    video_assignments: catalog.videoAssignments,
    updated_at: new Date().toISOString(),
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_catalog`, {
    method: 'POST',
    headers: {
      ...serviceRoleHeaders(env),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })
  const rows = await response.json().catch(() => [])
  if (!response.ok) {
    const message = rows?.message || rows?.error || 'Course catalog save failed'
    if (message.includes('course_catalog') || message.includes('schema cache')) {
      throw new Error('Course catalog table missing. Run the Supabase migration first.')
    }
    throw new Error(message)
  }
  const row = Array.isArray(rows) ? rows[0] : null

  return {
    courses: Array.isArray(row?.courses) ? row.courses : catalog.courses,
    cfVideos: Array.isArray(row?.cf_videos) ? row.cf_videos : catalog.cfVideos,
    videoAssignments: row?.video_assignments && typeof row.video_assignments === 'object' ? row.video_assignments : catalog.videoAssignments,
    updatedAt: row?.updated_at || payload.updated_at,
  }
}

function serviceRoleHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function requireAdmin(request, env) {
  const userData = await requireUser(request, env)

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const profileUrl = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  profileUrl.searchParams.set('id', `eq.${userData.id}`)
  profileUrl.searchParams.set('select', 'role,status')

  const profileResponse = await fetch(profileUrl.toString(), {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const profiles = await profileResponse.json()
  if (!profileResponse.ok) throw new Error('Admin profile verification failed')

  const profile = Array.isArray(profiles) ? profiles[0] : null
  if (profile?.role !== 'admin' || profile?.status !== 'active') {
    throw new Error('Admin permission required')
  }

  return userData
}

async function requireUser(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase auth verification is not configured')
  }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw new Error('Missing authorization token')

  const userResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  const userData = await userResponse.json()
  if (!userResponse.ok || !userData?.id) throw new Error('Invalid authorization token')

  return userData
}

function validateCalendarEventBody(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid event payload')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) throw new Error('Invalid event date')
  if (!BOOKING_TIME_SLOTS.includes(body.timeSlot)) throw new Error('Invalid event time')
  if (!body.topic || typeof body.topic !== 'string') throw new Error('Invalid event topic')
}

function buildBookingCalendarEvent(body) {
  const durationMinutes = getRequestedDurationMinutes(body.durationMinutes)
  const { start, end } = getSlotRange(body.date, body.timeSlot, durationMinutes)
  const typeLabel = body.type === 'shooting' ? '拍攝預約' : '一對一輔導'
  const studentName = body.studentName || '學員'
  const studentEmail = body.studentEmail || ''
  const title = `${typeLabel}｜${studentName}｜${body.topic.trim()}`
  const descriptionLines = [
    `預約類型：${typeLabel}`,
    `學員：${studentName}`,
    studentEmail ? `Email：${studentEmail}` : null,
    body.bookingId ? `Booking ID：${body.bookingId}` : null,
    body.notes ? `備註：${body.notes}` : null,
  ].filter(Boolean)

  return {
    summary: title,
    description: descriptionLines.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Taipei' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Taipei' },
    transparency: 'opaque',
  }
}

async function googleCalendarFetch(env, token, path, method, body) {
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID)
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (method === 'DELETE' && response.status === 404) return {}
  if (method === 'DELETE' && response.status === 204) return {}

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar event sync failed')
  return data
}

async function getGoogleBusyRanges(date, token, env, excludeEventId = '') {
  if (excludeEventId) {
    return getGoogleEventRanges(date, token, env, excludeEventId)
  }

  const [freeBusyRanges, eventRanges] = await Promise.all([
    getGoogleFreeBusyRanges(date, token, env),
    getGoogleEventRanges(date, token, env),
  ])

  return [...freeBusyRanges, ...eventRanges]
}

async function getGoogleFreeBusyRanges(date, token, env) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: `${date}T00:00:00${TAIPEI_OFFSET}`,
      timeMax: `${date}T23:59:59${TAIPEI_OFFSET}`,
      timeZone: 'Asia/Taipei',
      items: [{ id: env.GOOGLE_CALENDAR_ID }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar freeBusy failed')
  const calendar = data.calendars?.[env.GOOGLE_CALENDAR_ID]
  if (!calendar) throw new Error('Google Calendar result missing')
  if (Array.isArray(calendar.errors) && calendar.errors.length) {
    const message = calendar.errors.map(item => item.reason || item.message).filter(Boolean).join(', ')
    throw new Error(message || 'Google Calendar access failed')
  }
  return calendar.busy || []
}

async function getGoogleEventRanges(date, token, env, excludeEventId = '') {
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID)
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`)
  url.searchParams.set('timeMin', `${date}T00:00:00${TAIPEI_OFFSET}`)
  url.searchParams.set('timeMax', `${date}T23:59:59${TAIPEI_OFFSET}`)
  url.searchParams.set('timeZone', 'Asia/Taipei')
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar events failed')

  return (data.items || [])
    .filter(event => event.status !== 'cancelled')
    .filter(event => event.id !== excludeEventId)
    .map(event => {
      const start = parseGoogleEventDate(event.start, 'start')
      const end = parseGoogleEventDate(event.end, 'end')
      return start && end ? { start: start.toISOString(), end: end.toISOString() } : null
    })
    .filter(Boolean)
}

function parseGoogleEventDate(value, boundary) {
  if (!value) return null
  if (value.dateTime) return new Date(value.dateTime)
  if (value.date) return new Date(`${value.date}T00:00:00${TAIPEI_OFFSET}`)
  return boundary === 'end' ? new Date(0) : null
}

function getRequestedDurationMinutes(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BOOKING_DURATION_MINUTES
  return Math.min(parsed, 480)
}

function getSlotRange(date, slot, durationMinutes) {
  const start = new Date(`${date}T${slot}:00${TAIPEI_OFFSET}`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return { start, end }
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

function normalizePem(value) {
  return String(value || '').replace(/\\n/g, '\n')
}

// ── Signed Token (RS256 JWT) ───────────────────────────────────────────────
/**
 * Generates a Cloudflare Stream signed token (RS256 JWT).
 * The resulting token replaces the video UID in the playback URL:
 *   https://customer-{code}.cloudflarestream.com/{TOKEN}/iframe
 *
 * env vars required:
 *   CLOUDFLARE_STREAM_KEY_ID      — key ID shown in CF Stream → Signing Keys
 *   CLOUDFLARE_STREAM_SIGNING_KEY — PKCS#8 PEM private key (BEGIN PRIVATE KEY)
 */
async function generateSignedToken(videoUid, expiresInSeconds, env) {
  const now = Math.floor(Date.now() / 1000)

  const header  = { alg: 'RS256', kid: env.CLOUDFLARE_STREAM_KEY_ID }
  const payload = {
    sub: videoUid,
    kid: env.CLOUDFLARE_STREAM_KEY_ID,
    exp: now + expiresInSeconds,
    iat: now,
    nbf: now,
  }

  return signJwt(header, payload, env.CLOUDFLARE_STREAM_SIGNING_KEY)
}

async function signJwt(header, payload, pem) {
  const b64  = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const b64u = s => b64(unescape(encodeURIComponent(s)))
  const b64b = buf => {
    let s = ''
    new Uint8Array(buf).forEach(b => (s += String.fromCharCode(b)))
    return b64(s)
  }

  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`
  const privateKey = await importPrivateKey(pem)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${b64b(signature)}`
}

async function importPrivateKey(pem) {
  // Strip PEM header/footer and whitespace, then base64-decode
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '')

  const binary = atob(b64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)

  return crypto.subtle.importKey(
    'pkcs8',
    buffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}
