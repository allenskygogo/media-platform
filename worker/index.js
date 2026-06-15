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
 *   RESEND_API_KEY                — optional, sends learning reminder emails
 *   EMAIL_FROM                    — optional verified sender, e.g. "頂級流量 <hello@toplevel-tw.com>"
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
const PLAN_LABELS = {
  trial: '自媒體獲客-定位體驗課',
  creator: '頂流達人',
  master: '頂流私塾',
  managed: '頂流代操',
}
const BILLING_CYCLE_LABELS = {
  annual: '年付',
  monthly: '月付',
  single: '一次付清',
}
const CONTRACT_VERSION = 'creator-online-v2-word-full'
const MASTER_CONTRACT_VERSION = 'master-online-v1-word-full'
const CONTRACT_CONSENT_TEXT = '我已閱讀並同意本合作協議書內容，確認以上資料為本人真實資料，並同意以線上點擊確認作為簽署意思表示。'
const CREATOR_QUOTE_FILE = 'creator-quote-39800.pdf'
const CONTRACT_PROJECT_ITEMS = [
  '一年陪跑學習：服務期間自本合約簽署並完成付款之日起算一年。',
  '一年內兩次實體課：依乙方開課梯次與場地安排通知甲方參與。',
  '每週線上內訓：提供短影音經營、內容系統化與商業轉換相關訓練。',
  '短影音商業定位：協助理解短影音變現方式，明確自身商業定位。',
  '個人 IP 內容定位：建立適合甲方產業與個人品牌的內容主軸。',
  '爆款選題系統：協助建立素材庫分類、搜尋技巧與爆款選題發想流程。',
  '腳本寫作訓練：協助學習講觀點、曬過程與商業內容腳本落地化。',
  '自然風拍攝技巧：學習符合短影音平台觀看習慣之拍攝與表達方式。',
  '鏡頭表達訓練：強化口播、觀點表達與觀眾黏著度。',
  '剪輯與上架優化：提供影片剪輯、標題、發布與上架優化觀念。',
  '流量數據分析：學習觀察影片數據與判斷內容調整方向。',
  '變現路徑規劃：理解導流、成交與商業內容設計方向。',
]
const CONTRACT_CLAUSES = [
  {
    title: '第一條　費用與付款',
    paragraphs: [
      '本次合作總費用：新台幣 參萬玖仟捌佰 元整（NT$39,800），未稅。',
      '如甲方需乙方開立統一發票，應另加 5% 營業稅，稅額依實際開立金額計算。',
      '付款方式：本合約簽署後，甲方應以全額一次付清方式支付款項。乙方確認款項入帳後，依約提供課程與陪跑服務。',
      '匯款資訊：中國信託三民分行；戶名：遐光映畫工作室；帳號：118540475715。',
    ],
  },
  {
    title: '第二條　雙方義務',
    groups: [
      {
        subtitle: '（一）甲方義務',
        items: [
          '甲方應指定主要聯絡窗口，配合乙方課程通知、作業提交、檢討與相關溝通。',
          '甲方應依照課程安排參與學習、完成必要作業及回饋，以利學習成果累積。',
          '甲方應確保提供給乙方之文字、圖片、影片、品牌資料、商業資料及其他內容均具合法使用權，如有侵權或違法情事，概由甲方自行負責。',
          '甲方如需請假、改期或調整參與時間，應提前通知乙方，實體課與線上課程相關安排依乙方公告與實際名額為準。',
          '甲方不得將課程帳號、教材、錄影、講義、AI 工具、社群內容或陪跑資料提供予第三人使用、轉售、公開散布或作商業轉載。',
        ],
      },
      {
        subtitle: '（二）乙方義務',
        items: [
          '乙方應依本合約約定提供短影音一年達人班之課程、內訓、陪跑與相關學習資源。',
          '乙方應於合理範圍內提供內容方向、腳本、拍攝表達、數據判斷及變現路徑等學習建議。',
          '乙方提供之課程與工具內容，屬教學與方法輔助，不保證特定流量、粉絲數、營收或成交結果。',
          '乙方應妥善維護課程與學員社群秩序，並依實際課程進度調整教學與服務安排。',
        ],
      },
    ],
  },
  {
    title: '第三條　服務期間與交付方式',
    paragraphs: [
      '本服務期間自本合約完成線上簽署並完成付款之日起算一年。',
      '課程與陪跑服務以線上課程、線上內訓、群組通知、實體課程及其他乙方指定方式提供。',
      '實體課程之日期、地點及參與方式由乙方另行公告；如遇不可抗力或場地、師資、政策等因素，乙方得調整課程形式或時間。',
    ],
  },
  {
    title: '第四條　智慧財產權與使用限制',
    paragraphs: [
      '乙方提供之課程教材、簡報、錄影、作業範例、AI 工具、社群內容與相關方法論，均為乙方或其授權人所有，甲方僅得於個人學習目的範圍內使用。',
      '甲方不得擅自重製、錄影、截圖散布、公開傳輸、改作、轉售、出租、授權、提供帳號予他人使用或以任何方式侵害乙方權益。',
      '甲方依課程產出之自身帳號內容、作業及個人品牌素材，除另有約定外，由甲方自行持有；乙方得於取得甲方同意後作為案例展示。',
    ],
  },
  {
    title: '第五條　保密約定',
    paragraphs: ['雙方因本合作所知悉之商業資訊、課程內容、學員資料、策略建議、帳號數據及其他未公開資訊，均負保密義務。未經他方書面或線上明確同意，不得洩漏、公開或提供予第三人。'],
  },
  {
    title: '第六條　退費與解除',
    paragraphs: [
      '本服務包含數位課程、實體課程服務、社群資源及實體課程名額安排，甲方完成付款並取得課程或社群存取權後，除法律另有規定或乙方重大違約外，甲方不得任意要求解除或退費。',
      '甲方如有違反本合約、侵害乙方智慧財產權、干擾課程秩序、惡意散布不實資訊或其他重大違約情事，乙方得暫停或終止服務，且甲方不得要求退費。',
      '乙方如因不可歸責於雙方之因素需調整課程時間或提供方式，應以合理方式通知甲方，並以改期、線上替代、補課或其他可行方式處理。',
    ],
  },
  {
    title: '第七條　不可抗力',
    paragraphs: ['因天災、戰爭、疫情、政府命令、網路服務中斷、平台政策變動或其他不可抗力因素，致任一方無法依約履行全部或一部義務時，受影響之一方得於合理範圍內延期或調整履行方式，且不負違約責任。'],
  },
  {
    title: '第八條　爭議處理',
    paragraphs: ['本合約之解釋、履行及爭議處理，雙方同意以中華民國法律為準據法。如因本合約涉訟，雙方同意以臺灣高雄地方法院為第一審管轄法院。'],
  },
  {
    title: '第九條　線上簽署與合約效力',
    paragraphs: [
      '雙方同意本合約得以線上簽署、電子簽章或其他可辨識簽署人身分之電子方式完成簽署。',
      '本合約以線上簽署方式完成時，與紙本親筆簽名或蓋章具有同等效力。',
      '本合約自雙方完成線上簽署且甲方完成付款之日起生效。',
    ],
  },
  {
    title: '第十條　其他',
    paragraphs: [
      '本合約未盡事宜，雙方得另以書面、電子郵件或線上簽署補充協議約定之。',
      '本合約以電子檔形式供雙方保存。雙方得各自下載或列印保存，作為履約憑證。',
    ],
  },
]

const MASTER_CONTRACT_PROJECT_ITEMS = [
  '一年策略陪跑：提供帳號方向、內容策略、商業定位與成長路徑之持續陪跑建議。',
  '三天兩夜實體課程：包含短影音獲客、內容定位、腳本表達、拍攝實戰與商業轉換相關訓練。',
  '頂流私塾專屬群：提供高階學員交流、提問與陪跑社群支援。',
  '每月線上帳號健檢：每月協助檢視帳號方向、內容表現、主軸一致性與優化重點。',
  '每月內容方向調整：依帳號數據、產業特性與商業目標，協助規劃下月內容方向。',
  '選題與腳本優化：協助修正短影音選題、腳本架構、開場、觀點、轉折與 CTA。',
  '個人 IP 定位優化：協助優化人設、記憶點、內容主軸、成交理由與品牌表達。',
  '私域成交設計：協助規劃導流誘因、私訊溝通方向、私域成交流程與內容銜接。',
  '高階 AI 工具使用權：開放高階 AI 工具使用，包含選題、腳本、文案、導流與成交相關工具，實際功能依乙方系統開放狀況為準。',
  '每月實體一對一代練拍攝預約資格：甲方每月可預約一次實體一對一手把手代練拍攝或策略指導，須依乙方可預約時段提前安排。每月一對一資格僅限當月使用；未預約、臨時取消、未到場、逾時或未於當月完成使用者，該次資格即視為已使用，不得遞延至次月或其他月份，亦不得折抵現金或折抵其他服務，雙方另有書面約定者除外。',
  '每月成果覆盤：定期檢查執行狀況、內容成效與下階段改善方向。',
  '實體課優先複訓：於乙方實體課程梯次開放時，甲方得享有優先報名或候補資格，實際名額依乙方公告為準。',
  '個人案例打造：協助整理甲方學習成果與帳號案例，作為個人品牌、成交素材或未來內容優化參考。',
]

const MASTER_CONTRACT_CLAUSES = [
  {
    title: '第三條　費用與付款',
    paragraphs: [
      '合作總費用：新台幣 壹拾貳萬玖仟捌佰元整（NT$129,800），未稅。',
      '發票與稅金：如甲方需乙方開立統一發票，應依法另加 5% 營業稅；實際稅務與發票開立方式依雙方付款與請款資訊為準。',
      '付款方式：甲方應於線上簽署本合約後，依乙方指定方式一次全額支付。乙方確認款項後，依本合約啟動服務。',
      '匯款資訊：匯款銀行/分行：中國信託 三民分行｜戶名：遐光映畫工作室｜帳號：118540475715',
    ],
  },
  {
    title: '第四條　雙方義務',
    groups: [
      {
        subtitle: '（一）甲方義務',
        items: [
          '甲方應指定主要聯絡人與乙方進行溝通、資料提供、課程與陪跑安排。',
          '甲方應提供與帳號、品牌、產品、服務、過往內容、商業目標相關之必要資料，以利乙方提出建議。',
          '甲方應保證其提供之素材、商標、音樂、圖片、影片、文字、產品資訊及相關內容均具合法使用權；如有侵權或違法爭議，由甲方自行負責。',
          '甲方應依約定時間參與課程、線上會議、實體課程或實體一對一預約；若因甲方因素延期、缺席或資料提供不完整，相關時程得順延或視為當次服務已提供。',
          '甲方理解自媒體成效受產業、產品、帳號條件、執行頻率、平台演算法、內容品質與市場反應等因素影響，乙方不保證特定粉絲數、播放量、營收或成交結果。',
        ],
      },
      {
        subtitle: '（二）乙方義務',
        items: [
          '乙方應依本合約約定提供課程、陪跑、諮詢、策略建議與相關工具使用權。',
          '乙方應依甲方提供之資料與實際執行情況，提供合理之帳號方向、內容策略、腳本與拍攝建議。',
          '乙方得就甲方擬製作或發布之內容提出合法性、平台規範或內容風險之修改建議。',
          '乙方不負責額外廣告投放費、第三方工具費、場地費、交通費、道具費、演員費、平台費、外部製作費或其他未列於本合約之費用。',
          '乙方提供之課程、工具、講義、文件、錄影與相關方法論，除雙方另有書面約定外，僅供甲方於本案學習與內部使用。',
        ],
      },
    ],
  },
  {
    title: '第五條　期程與預約規範',
    paragraphs: [
      '本服務為一年期陪跑服務，服務起算日以付款完成日或雙方另行書面確認之日期為準。',
      '每月線上健檢、成果覆盤與內容方向調整，應由甲乙雙方事先協調可執行時段。',
      '每月實體一對一預約資格需至少提前七個工作天與乙方確認時段；一對一資格以當月使用為原則，不得累積、遞延至次月或折抵其他服務。遇乙方課程、拍攝或不可抗力因素，雙方得協議於當月或雙方書面確認之時段內改期。',
      '甲方如需更改已預約之實體或線上服務時段，應至少提前三個工作天通知乙方，且改期以乙方可安排之當月時段為限；臨時取消、未到或逾時，乙方得認定該次服務已提供，且不得遞延、折抵或要求退款。',
      '本合約服務包含策略、陪跑、課程與訓練，不包含乙方代為營運甲方帳號、代剪影片、代發文、代回訊息或代投廣告；若需此類服務，應另行報價與簽署約定。',
    ],
  },
  {
    title: '第六條　著作權與使用範圍',
    paragraphs: [
      '甲方提供之品牌、商標、產品資訊、原始素材與個人肖像等權利，仍歸甲方或原權利人所有。',
      '乙方提供之課程內容、講義、工具、方法論、模板、AI 提示詞、策略文件與相關教材，其著作財產權及智慧財產權歸乙方所有，甲方不得未經授權複製、轉售、公開散布、移轉、出租或提供第三方使用。',
      '甲方於服務期間依乙方建議自行製作並發布之帳號內容，其成品權利原則上歸甲方所有；惟涉及乙方教材、模板、工具或未公開方法論者，甲方僅得於自身品牌與帳號經營目的範圍內使用。',
      '乙方如需使用甲方案例作為成果展示、教學示範或行銷素材，應取得甲方同意；展示範圍、去識別化程度及發布形式得另行確認。',
    ],
  },
  {
    title: '第七條　保密約定',
    paragraphs: ['雙方因本合作知悉對方之商業機密、營運資料、會員資料、帳號數據、未公開課程內容、策略文件、成交流程、報價資訊及其他非公開資訊，均應負保密義務。未經對方書面同意，不得洩漏、公開、轉讓或提供第三人使用。但依法令、主管機關、法院命令或本合約履行必要而揭露者，不在此限。'],
  },
  {
    title: '第八條　退款、終止與違約責任',
    paragraphs: [
      '本合約簽署後，甲方應依約付款。乙方確認款項後開始安排課程與服務資源。',
      '甲方完成付款且乙方已啟動服務、開通課程或提供陪跑資源後，除乙方無正當理由且經甲方通知後仍未於合理期間內提供約定服務外，甲方不得任意解除合約或要求退款。',
      '若因甲方個人因素、時間安排、執行意願、產業市場變化、平台演算法或帳號經營結果不如預期而終止合作，不得作為退款理由。',
      '若乙方無正當理由，且經甲方以書面或可留存紀錄方式通知後仍未於合理期間內協調或推進服務，致約定內容無法交付，甲方得就未交付之服務項目與乙方協議退款或替代服務安排。',
      '任何一方違反本合約，致他方受有損害者，應負相應賠償責任；但間接損害、預期利益、營業損失、商譽損失，除法律另有強制規定外，不在賠償範圍內。',
    ],
  },
  {
    title: '第九條　不可抗力',
    paragraphs: ['如因天災、戰爭、疫情、政府命令、重大平台政策變更、交通中斷、網路服務中斷或其他不可歸責於任一方之不可抗力事件，致本合約全部或一部無法履行，受影響之一方應即時通知他方，雙方得協議延期、變更執行方式或調整服務時程。'],
  },
  {
    title: '第十條　線上簽署與通知',
    paragraphs: [
      '本合約得以電子簽章、線上簽署平台、電子郵件確認或其他可證明簽署意思表示之方式簽署；其效力與紙本簽章相同。',
      '甲方於線上簽署時填寫之姓名、公司名稱、統一編號、電子郵件、電話、IP 紀錄、簽署時間或平台驗證資訊，得作為識別簽署人與簽署意思表示之依據。',
      '本合約相關通知得以電子郵件、LINE、簡訊、線上簽署平台通知或其他雙方慣用且可留存紀錄之方式為之。',
    ],
  },
  {
    title: '第十一條　爭議處理與管轄法院',
    paragraphs: ['本合約如有未盡事宜，雙方得本誠信原則協議補充。本合約之解釋、履行及爭議處理，適用中華民國法律；如需涉訟，雙方同意以臺灣高雄地方法院為第一審管轄法院。'],
  },
  {
    title: '第十二條　合約份數與生效',
    paragraphs: ['本合約以線上簽署方式成立者，雙方得各自保存電子檔或線上簽署平台所產生之簽署紀錄。本合約自雙方完成簽署並由甲方完成付款後生效；未完成付款前，乙方得暫停開通課程、工具或陪跑服務。'],
  },
]
const ECPAY_STAGE_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
const ECPAY_PROD_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
const NEWEBPAY_STAGE_URL = 'https://ccore.newebpay.com/MPG/mpg_gateway'
const NEWEBPAY_PROD_URL = 'https://core.newebpay.com/MPG/mpg_gateway'
const NEWEBPAY_VERSION = '2.0'
const AI_AGENT_ADMIN_PASSWORD = '0910858551'
const SOCIAL_HUMAN_WRITING_RULE = `社群貼文真人感規則：
- readyPost 要像真人把一段原始想法修順後發出去，不要像行銷顧問在寫教科書、懶人包或農場文。
- 必須以使用者提供的原文、對話、事件、人物、場景或情緒為主軸；如果原文有可用的口語句子，至少保留一句或改寫成接近原句的語氣。
- 開頭不要每次都用「很多人」「你是不是」「你有沒有發現」「真正的問題不是」「最近我發現」這類模板句；優先從一個具體對話、場景、時間點、反應或原文裡最有情緒的句子開始。
- 不要寫成「不是 A，而是 B」「與其 A，不如 B」「與其...倒不如...」「方向對了，內容才會累積」「精準大於流量」「流量自然會來」「找到突破口」這種萬用金句，除非使用者原文真的這樣講。
- 不要使用農場文詞：流量密碼、爆款公式、必看、收藏起來、你一定要知道、看完秒懂、逆襲、翻轉人生、品牌經營、行銷策略、精準行銷、社群心法、乾貨滿滿、突破口、打中需求。
- 不要使用 AI 常見口吻與詞彙：很卡、不卡、卡住、卡在、卡點、很穩、要穩、穩穩、穩定輸出、穩定成長、很有感、超有感。
- 不要把原本很像人的內容改成制式教學。每篇貼文只抓一個主情緒或一個主要觀點，講深一點，不要塞很多條建議。
- CTA 要像真人收尾，不要寫「歡迎留言分享你的經驗」「留言告訴我」「快分享給朋友」這種制式互動句。批判文優先用保護型收尾，例如「轉給正在被這類廣告轟炸的人，讓他少走一點冤枉路」；其他角度可以直接自然收尾。
- Hashtag 只放 3 到 5 個，必須貼近主題，不要使用 #流量密碼 #品牌經營 #行銷策略 這種泛標籤。
- Hashtag 不要使用 #精準行銷 #社群心法 #品牌經營 #行銷策略 這種泛標籤；優先使用從原文主題可直接看出的詞，例如 #發文頻率 #內容創作 #社群文案。
- readyPost 的每一句都要通過檢查：如果這句換到其他主題也能成立，就刪掉或改成跟使用者原文事件有關的句子。
- 文章要讓人看得出心情。每篇 readyPost 必須有明確情緒底色，例如生氣、心疼、開心、無奈、驚訝、釋懷、堅定、溫柔提醒；不要只做理性整理。
- 完成後請自己刪掉任何聽起來像 AI、農場文、課綱、講義、模板、雞湯或空泛口號的句子，只留下像本人會發的內容。`
const SOCIAL_ANGLE_RULE = `社群貼文四角度規則：
- 最新規則優先於前文所有「10 個角度」或其他角度數量要求。
- angles 任務只回傳 4 個角度，而且必須剛好依序是：批判、溫馨、開心、分析。
- 每一筆 angle 必須有 category 欄位，值只能是「批判」「溫馨」「開心」「分析」。
- 批判：批判脆版，毒舌、直接、幽默嘲諷、強烈；帶一點不爽、戳破、反駁或替受眾出氣，但不要罵髒話。
- 溫馨：溫馨版，溫柔、陪伴、鼓勵、療癒；帶安慰、理解、提醒或心疼感。
- 開心：開心版，輕鬆、幽默、正能量、好玩；帶成就、驚喜、可愛、分享好消息或小確幸。
- 分析：分析版，理性、拆解、數據/邏輯、專業感；但不能寫成論文或報告。
- 生成貼文時，要依 selectedAngle.category 決定文章心情；文章不能平淡到像機器整理，讀者要看得出情緒。`
const SOCIAL_FRAMEWORK_RULE = `社群貼文生成框架：
- 這套框架必須能套用在各行各業；減肥產品只是範例，不可只會寫減肥。
- 每次生成時都要明確判斷：平台、風格、目標受眾、額外要求。
- 平台可包含 IG、Facebook、Threads、小紅書、抖音或使用者指定平台。若使用者沒有指定，預設輸出 IG / Facebook / Threads；若使用者指定小紅書或抖音，請在 platforms 裡額外加入 xiaohongshu 或 douyin。
- 風格必須從四種選一種，並依 selectedAngle.category 對應：批判=批判脆版、溫馨=溫馨版、開心=開心版、分析=分析版。
- 目標受眾必須從使用者輸入推斷，例如姐妹、年輕女性、正在減肥的人、創業者、學員、上班族、家長、老闆；不要寫成泛泛的「一般大眾」。
- 額外要求要吃進使用者指定的長度、更毒、更長、加個人故事、指定 hashtag、指定平台或指定語氣。

貼文標準結構：
1. 開頭鉤子：1 到 2 句，吸引注意力；可用吐槽廣告、分享痛點、幽默開場、提問、原文裡最有情緒的一句。
2. 主體內容：指出核心問題、痛點、事件或觀點；批判脆版要有嘲諷和戳破，溫馨版要先共情再引導，開心版要有笑點和正向感，分析版要列點拆解或講清楚邏輯。
3. 正面建議：必須給出一個更好的方向或可行做法。以減肥為例是熱量赤字、運動、均衡飲食、睡眠；其他產業要換成該主題真正合理的做法。
4. 情感結尾與 CTA：要有情緒、共鳴或保護感，並自然呼籲轉發、留言、分享經驗、私訊或保存；不可硬要互動。
5. Hashtag：3 到 7 個，必須貼近主題與平台語境；不可亂堆泛標籤。

長度規則：
- IG readyPost 建議 100 到 180 字，除非使用者要求更長。
- Facebook readyPost 建議 200 到 350 字，除非使用者要求更短或更長。
- Threads readyPost 建議 80 到 180 字。
- 小紅書 readyPost 可偏生活感、心得感、分段清楚，建議 180 到 350 字。
- 抖音文案要更像短影音 caption，第一句要快，建議 60 到 150 字。
- 可以少量使用表情符號提升視覺感，但每篇最多 1 到 3 個，必須自然；不要把 emoji 當裝飾亂塞。`
const SOCIAL_CRITIQUE_PATTERN_RULE = `批判角度範例文法：
- 當 selectedAngle.category = "批判" 時，可以參考「減肥產品批判文」的節奏，但不要照抄原句。
- 節奏一：用「又來了」「又開始了」「我真的看不下去」這類有情緒的開場，直接讓讀者知道作者不爽。
- 節奏二：列出對方最誇張、最荒謬、最像廣告詐術的原話或常見話術，例如「30 天瘦 20 公斤」「不用努力也能得到結果」這種句型。
- 節奏三：用一句短句打醒讀者，例如「醒醒吧」「別再被這種話術牽著走」「這不是幫你，是在收割你」。
- 節奏四：拆穿它真正靠什麼運作，講出背後機制、代價、風險或被隱藏的真相。
- 節奏五：把批判拉回保護讀者：真正可怕的不是使用者不夠好，而是被假承諾、焦慮販賣或爛產品持續羞辱。
- 節奏六：給一個更誠實的方向，語氣要像提醒朋友，不要像老師訓話。
- 節奏七：收尾可以請讀者轉給正在被同類廣告、話術或焦慮轟炸的人，但不要使用制式「歡迎留言分享」。
- 批判要有怒氣，也要有保護感；不是為了罵而罵。`
const SOCIAL_AGENT_SYSTEM_PROMPT = `你是一位深諳受眾心理、社群平台文化、Meta 內容分發邏輯、品牌敘事與轉化設計的頂級社群文案策略師。
你的任務不是單純把句子寫漂亮，也不是輸出分析報告，而是把使用者貼上的一段對話、想法、文案、產品資訊、活動資訊或長文，優化成適合 Instagram、Facebook、Threads 直接發布的原生貼文。

核心目標：
- Instagram：提升閱讀停留、收藏、分享、留言、私訊、陌生觸及。
- Facebook：提升有意義的互動、留言深度、分享、討論延展、連結點擊。
- Threads：提升回覆率、轉發率、引用率、個人檔案互動、連結導流。

基本原則：
- 以人為中心，不寫出明顯機器感文案。
- 先判斷平台，再決定句型、長度、節奏與 CTA。
- 避免 engagement bait、空洞口號、過度模板化、無關 hashtag 堆疊。
- 優先產出具有具體價值、明確觀點、真實情緒、可被討論或分享的內容。
- 若資訊不足，先做合理整理與定位，不要直接輸出空泛文案。
- 貼文必須貼近使用者提供的原文，不要把原文改到失去原本語氣、事件、情緒與重點。
- 正式貼文必須是一篇可以直接複製貼上的完整文章，不要只給大綱、拆解、分析、策略說明或零碎欄位。
- 每篇正式貼文都要包含第一段鉤子、正文、自然 CTA，以及相關 hashtag。
- Hashtag 要相關、精準、少量，不要亂堆。
- 使用繁體中文，句子短、節奏快、可掃讀。
- 必要時可加入換行與條列，但不要寫得像公文或 EDM。
- 不使用設計語言。
- 內容要能直接複製貼上。
- 只能回傳 JSON，不要輸出 Markdown，不要輸出 JSON 以外的文字。

${SOCIAL_ANGLE_RULE}

${SOCIAL_FRAMEWORK_RULE}

${SOCIAL_CRITIQUE_PATTERN_RULE}

${SOCIAL_HUMAN_WRITING_RULE}`
const SOCIAL_AGENT_USER_PROMPT = `請根據以下輸入執行 TOP LEVEL TRAFFIC 社群貼文 AI。

使用者輸入 JSON：
{{input_json}}

使用者方案：
{{userPlan}}

生成框架總要求：
- 請根據使用者提供的主題、產品、服務、活動資訊、長文內容、目標受眾或案例，生成一篇符合指定平台與風格的社群貼文。
- 若使用者指定平台、風格、目標受眾或額外要求，必須明確吃進策略卡與成品文案。
- 若沒有指定，請從輸入內容合理判斷平台與受眾，並用四角度讓使用者選。

任務判斷：
- 若 input.task = "angles"，只執行第一步：提出 4 個內容角度。
- 若 input.task = "generate"，依 input.selectedAngle 執行第二步與第三步。
- 如果 task 缺漏，請預設為 "angles"。

第一步：提出 4 個內容角度
每個角度都要包含：
- 內容切角名稱
- 適合的平台
- 風格名稱：批判脆版 / 溫馨版 / 開心版 / 分析版
- 主要受眾心理觸發點
- 為什麼這個角度有機會引發互動或分享
四個角度固定為：批判、溫馨、開心、分析。

若 task = "angles"，請回傳此 JSON：
{
  "angles": [
    {
      "category": "批判|溫馨|開心|分析",
      "name": "內容切角名稱",
      "style": "批判脆版|溫馨版|開心版|分析版",
      "platforms": ["IG", "Facebook", "Threads"],
      "targetAudience": "目標受眾",
      "extraRequirements": "從使用者輸入推斷的額外要求，沒有則填空字串",
      "trigger": "主要受眾心理觸發點",
      "reason": "為什麼有機會引發互動或分享"
    }
  ]
}
規則：
- angles 必須剛好 4 筆。
- 四筆 category 必須依序是：批判、溫馨、開心、分析。
- 每筆 name 都要具體，可直接讓使用者判斷要不要採用。
- 不要寫泛用標題，不要只換同義詞。
- 每個角度都要有不同心情，不要只換包裝。

第二步：確認後產出內容策略卡
當 task = "generate" 時，請根據 input.source 與 input.selectedAngle，產出內容策略卡：
- 平台
- 風格
- 核心受眾
- 貼文目的
- 漏斗位置
- 平台差異
- 主張句
- 核心鉤子
- 情緒切入點
- CTA 方向
- 禁用說法與風格風險

第三步：輸出平台成品貼文
針對 IG / FB / Threads 各寫至少一版「可直接貼上」的完整貼文。
每一版都要包含：
- 第一段鉤子：每篇文章第一段要能讓人停下來看，必須貼近使用者原文的痛點、對話、事件或情緒。
- 可直接貼文：完整成品文章，包含第一段鉤子、正文、自然 CTA、相關 hashtag。這一欄必須可以整段複製去發布。
- 短版備案
- 較強話題版備案
- Hashtag
- 首則留言建議
- 可搭配的簡短視覺說明或 alt text 建議

若 task = "generate"，請回傳此 JSON：
{
  "strategy": {
    "platform": "主要平台或使用者指定平台",
    "style": "批判脆版|溫馨版|開心版|分析版",
    "coreAudience": "核心受眾",
    "purpose": "貼文目的",
    "funnelPosition": "漏斗位置",
    "platformDifference": "平台差異",
    "claim": "主張句",
    "coreHook": "核心鉤子",
    "emotion": "情緒切入點",
    "ctaDirection": "CTA 方向",
    "risk": "禁用說法與風格風險"
  },
  "platforms": {
    "ig": {
      "firstParagraphHook": "第一段鉤子",
      "readyPost": "可直接貼上的完整 IG 貼文，內含第一段鉤子、正文、自然 CTA、相關 hashtag",
      "shortVersion": "短版備案",
      "boldVersion": "較強話題版備案",
      "hashtags": "#相關標籤 #相關標籤",
      "firstComment": "首則留言建議",
      "visualNote": "簡短視覺說明或 alt text 建議"
    },
    "fb": {
      "firstParagraphHook": "第一段鉤子",
      "readyPost": "可直接貼上的完整 Facebook 貼文，內含第一段鉤子、正文、自然 CTA、相關 hashtag",
      "shortVersion": "短版備案",
      "boldVersion": "較強話題版備案",
      "hashtags": "#相關標籤 #相關標籤",
      "firstComment": "首則留言建議",
      "visualNote": "簡短視覺說明或 alt text 建議"
    },
    "threads": {
      "firstParagraphHook": "第一段鉤子",
      "readyPost": "可直接貼上的完整 Threads 貼文，內含第一段鉤子、正文、自然 CTA、相關 hashtag",
      "shortVersion": "短版備案",
      "boldVersion": "較強話題版備案",
      "hashtags": "#相關標籤 #相關標籤",
      "firstComment": "首則留言建議",
      "visualNote": "簡短視覺說明或 alt text 建議"
    },
    "xiaohongshu": {
      "firstParagraphHook": "使用者指定小紅書時才輸出",
      "readyPost": "可直接貼上的完整小紅書貼文",
      "shortVersion": "短版備案",
      "boldVersion": "較強話題版備案",
      "hashtags": "#相關標籤 #相關標籤",
      "firstComment": "首則留言建議",
      "visualNote": "簡短視覺說明或 alt text 建議"
    },
    "douyin": {
      "firstParagraphHook": "使用者指定抖音時才輸出",
      "readyPost": "可直接貼上的完整抖音文案",
      "shortVersion": "短版備案",
      "boldVersion": "較強話題版備案",
      "hashtags": "#相關標籤 #相關標籤",
      "firstComment": "首則留言建議",
      "visualNote": "簡短視覺說明或 alt text 建議"
    }
  }
}

平台寫作規則：
- IG：開頭要快、段落短、重點清楚，但不要像懶人包。readyPost 建議 100-180 字，hashtag 3-5 個。
- Facebook：可以稍長，重視故事、脈絡、討論延展與留言深度。readyPost 建議 200-350 字，hashtag 3-5 個。
- Threads：句子更短、更像真人即時觀點，能引發回覆、轉發、引用。readyPost 建議 80-180 字，hashtag 2-4 個。
- 小紅書：若使用者指定小紅書，請在 platforms.xiaohongshu 輸出；語氣像心得分享，標題感強，hashtag 可 4-7 個。
- 抖音：若使用者指定抖音，請在 platforms.douyin 輸出；像短影音 caption，第一句要快，hashtag 可 3-5 個。
- CTA 不可使用「留言+1」「按讚分享」這種 engagement bait；要用自然、有意義的互動方向。
- 可少量使用 emoji 提升視覺感，每篇最多 1 到 3 個，且必須貼近語氣，不要亂塞。
- 不要輸出「以下是」「我幫你整理」「策略如下」這種前言。
- 不要輸出像企劃案、EDM 或 AI 模板的文字。
- 如果使用者貼的是一段對話或粗糙文案，請保留原本最有情緒、最像真人說話的核心句子，再修成更順、更有鉤子的貼文。
- readyPost 必須把 hashtag 放在文末。
- 所有文案都要可直接複製貼上。

${SOCIAL_ANGLE_RULE}

${SOCIAL_FRAMEWORK_RULE}

${SOCIAL_CRITIQUE_PATTERN_RULE}

${SOCIAL_HUMAN_WRITING_RULE}`
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
  social: {
    feature_key: 'social',
    name: '社群貼文 Agent',
    model: 'gpt-4.1-mini',
    temperature: 0.62,
    system_prompt: SOCIAL_AGENT_SYSTEM_PROMPT,
    user_prompt_template: SOCIAL_AGENT_USER_PROMPT,
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
  if (agent.feature_key === 'social') {
    const withRule = text => {
      let next = String(text || '')
      if (!next.includes('社群貼文四角度規則')) {
        next = `${next}\n\n${SOCIAL_ANGLE_RULE}`.trim()
      }
      if (!next.includes('社群貼文生成框架')) {
        next = `${next}\n\n${SOCIAL_FRAMEWORK_RULE}`.trim()
      }
      if (!next.includes('批判角度範例文法')) {
        next = `${next}\n\n${SOCIAL_CRITIQUE_PATTERN_RULE}`.trim()
      }
      if (!next.includes('社群貼文真人感規則')) {
        next = `${next}\n\n${SOCIAL_HUMAN_WRITING_RULE}`.trim()
      }
      return next
    }
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
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
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

      // POST /api/admin/course-cover → upload a public course cover image
      if (path === '/api/admin/course-cover' && request.method === 'POST') {
        return await handleUploadCourseCover(request, env)
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

      // GET /api/ai/agent-health?feature=social → prompt/database alignment health
      if (path === '/api/ai/agent-health' && request.method === 'GET') {
        return await handleAIAgentHealth(url, env)
      }

      // POST /api/admin/ai-agents/sync-default → upsert a built-in default agent into DB
      if (path === '/api/admin/ai-agents/sync-default' && request.method === 'POST') {
        return await handleSyncDefaultAIAgent(request, env)
      }

      // POST /api/admin/bootstrap-admin → create/update a protected admin account
      if (path === '/api/admin/bootstrap-admin' && request.method === 'POST') {
        return await handleBootstrapAdmin(request, env)
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

      // POST /api/checkout/upgrade → create a pending checkout order for the current member
      if (path === '/api/checkout/upgrade' && request.method === 'POST') {
        return await handleCreateUpgradeOrder(request, env)
      }

      // POST /api/contracts/sign → store current user's online contract signature
      if (path === '/api/contracts/sign' && request.method === 'POST') {
        return await handleSignContract(request, env)
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

      // GET /api/admin/students/:id/contracts → list a student's signed contracts
      if (path.startsWith('/api/admin/students/') && path.endsWith('/contracts') && request.method === 'GET') {
        const userId = decodeURIComponent(path.slice('/api/admin/students/'.length, -'/contracts'.length))
        return await handleListStudentContracts(request, userId, env)
      }

      // GET /api/admin/contracts/:id/download → download a rendered contract file
      if (path.startsWith('/api/admin/contracts/') && path.endsWith('/download') && request.method === 'GET') {
        const contractId = decodeURIComponent(path.slice('/api/admin/contracts/'.length, -'/download'.length))
        return await handleDownloadContract(request, contractId, env)
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

const COURSE_COVER_BUCKET = 'course-covers'

async function handleUploadCourseCover(request, env) {
  await requireAdmin(request, env)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Course cover storage is not configured', 503)
  }

  const body = await request.json().catch(() => ({}))
  const dataUrl = String(body.dataUrl || '')
  const fileName = String(body.fileName || 'cover.jpg')
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/)
  if (!match) return err('Invalid cover image', 400)

  const mimeType = match[1]
  const bytes = base64ToUint8Array(match[2])
  if (bytes.byteLength > 1024 * 1024) {
    return err('Cover image is too large after compression', 413)
  }

  await ensurePublicStorageBucket(env, COURSE_COVER_BUCKET)

  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const safeName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'cover'
  const objectPath = `${Date.now()}-${safeName}.${ext}`
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/')

  const uploadResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${COURSE_COVER_BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': mimeType,
      'Cache-Control': '31536000',
      'x-upsert': 'true',
    },
    body: bytes,
  })
  const uploadData = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok) {
    return err(uploadData?.message || uploadData?.error || 'Course cover upload failed', uploadResponse.status)
  }

  const publicUrl = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${COURSE_COVER_BUCKET}/${encodedPath}`
  return json({ success: true, publicUrl, path: objectPath })
}

async function ensurePublicStorageBucket(env, bucketName) {
  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '')
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }

  const readResponse = await fetch(`${baseUrl}/storage/v1/bucket/${encodeURIComponent(bucketName)}`, { headers })
  if (readResponse.ok) return

  const createResponse = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: true,
      file_size_limit: 1048576,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  })
  const createData = await createResponse.json().catch(() => ({}))
  if (!createResponse.ok && createResponse.status !== 409) {
    throw new Error(createData?.message || createData?.error || 'Create course cover bucket failed')
  }
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function progressStorageId(value) {
  const text = String(value ?? '').trim()
  const numeric = Number(text)
  if (Number.isInteger(numeric) && numeric > 0 && numeric <= 2147483647) return numeric

  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 2147483647 || 1
}

function normalizeCourseProgressRow(row, originalIds = {}) {
  if (!row) return null
  const lessonMap = originalIds.lessonMap || new Map()
  return {
    userId: row.user_id,
    courseId: originalIds.courseId ?? row.course_id,
    lessonId: lessonMap.get(Number(row.lesson_id)) ?? originalIds.lessonId ?? row.lesson_id,
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
  const rawCourseId = url.searchParams.get('courseId')
  const courseId = Number(rawCourseId)
  if (!Number.isFinite(courseId)) return err('Missing course id', 400)
  const storageCourseId = progressStorageId(rawCourseId)

  const rawLessonIds = String(url.searchParams.get('lessonIds') || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  const lessonMap = new Map(rawLessonIds.map(value => [progressStorageId(value), Number(value)]))
  const storageLessonIds = rawLessonIds.map(progressStorageId)

  const progressUrl = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/course_progress`)
  progressUrl.searchParams.set('select', 'user_id,course_id,lesson_id,current_second,completed,completed_at,watch_count,updated_at')
  progressUrl.searchParams.set('user_id', `eq.${user.id}`)
  progressUrl.searchParams.set('course_id', `eq.${storageCourseId}`)
  if (storageLessonIds.length > 0) {
    progressUrl.searchParams.set('lesson_id', `in.(${storageLessonIds.join(',')})`)
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
    progress: Array.isArray(rows) ? rows.map(row => normalizeCourseProgressRow(row, { courseId, lessonMap })) : [],
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
  const storageCourseId = progressStorageId(body.courseId)
  const storageLessonId = progressStorageId(body.lessonId)
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
    existingUrl.searchParams.set('course_id', `eq.${storageCourseId}`)
    existingUrl.searchParams.set('lesson_id', `eq.${storageLessonId}`)
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
    course_id: storageCourseId,
    lesson_id: storageLessonId,
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
    progress: normalizeCourseProgressRow(Array.isArray(rows) ? rows[0] : rows, { courseId, lessonId }),
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

function getAIAgentRuleChecks(agent) {
  const combined = `${agent?.system_prompt || ''}\n${agent?.user_prompt_template || ''}`
  return {
    fourAngles: combined.includes('社群貼文四角度規則'),
    framework: combined.includes('社群貼文生成框架'),
    critiquePattern: combined.includes('批判角度範例文法'),
    xiaohongshuDouyin: combined.includes('xiaohongshu') && combined.includes('douyin'),
    inputJsonTemplate: combined.includes('{{input_json}}'),
  }
}

function allChecksPass(checks) {
  return Object.values(checks || {}).every(Boolean)
}

async function handleAIAgentHealth(url, env) {
  const feature = String(url.searchParams.get('feature') || 'social').trim()
  if (!feature) return err('Missing AI feature', 400)

  const runtimeAgent = await getAIAgent(feature, env)
  const runtimeChecks = getAIAgentRuleChecks(runtimeAgent)
  const rawAgent = await getRawAIAgent(feature, env)
  const databaseChecks = rawAgent ? getAIAgentRuleChecks(rawAgent) : null

  return json({
    success: true,
    feature,
    hasDatabaseAgent: Boolean(rawAgent),
    runtime: {
      name: runtimeAgent?.name || null,
      enabled: runtimeAgent?.enabled ?? true,
      checks: runtimeChecks,
      matched: allChecksPass(runtimeChecks),
    },
    database: rawAgent ? {
      name: rawAgent.name || null,
      enabled: rawAgent.enabled,
      updated_at: rawAgent.updated_at || null,
      checks: databaseChecks,
      matched: allChecksPass(databaseChecks),
    } : null,
  })
}

async function handleSyncDefaultAIAgent(request, env) {
  const password = request.headers.get('x-agent-admin-password') || ''
  if (password !== AI_AGENT_ADMIN_PASSWORD) return err('Unauthorized', 401)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service is not configured', 503)
  }

  const body = await request.json().catch(() => ({}))
  const feature = String(body.feature || 'social').trim()
  const agent = DEFAULT_AI_AGENTS[feature]
  if (!agent) return err('Unsupported default agent', 400)

  const payload = {
    feature_key: agent.feature_key,
    name: agent.name,
    description: agent.description || null,
    system_prompt: agent.system_prompt,
    user_prompt_template: agent.user_prompt_template,
    output_schema: agent.output_schema || {},
    model: agent.model || 'gpt-4.1-mini',
    temperature: Number(agent.temperature ?? 0.85),
    required_plan: agent.required_plan || 'trial',
    enabled: agent.enabled !== false,
    notes: `Synced from Worker default on ${new Date().toISOString()}`,
    updated_at: new Date().toISOString(),
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_agents`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    return err(data?.message || data?.error || 'Failed to sync default AI agent', response.status)
  }

  return json({
    success: true,
    feature,
    synced: true,
    checks: getAIAgentRuleChecks(payload),
  })
}

async function handleBootstrapAdmin(request, env) {
  const password = request.headers.get('x-agent-admin-password') || ''
  if (password !== AI_AGENT_ADMIN_PASSWORD) return err('Unauthorized', 401)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service is not configured', 503)
  }

  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const adminPassword = String(body.password || '')
  const displayName = String(body.name || '平台管理員').trim() || '平台管理員'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('Invalid email', 400)
  }
  if (adminPassword.length < 6) {
    return err('Password must be at least 6 characters', 400)
  }

  try {
    let authUser = await getAuthUserByEmail(env, email)
    const authPayload = {
      email,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    }

    authUser = authUser?.id
      ? await updateSupabaseAuthUser(env, authUser.id, authPayload)
      : await createSupabaseAuthUser(env, authPayload)

    const profile = await upsertProfile(env, {
      id: authUser.id,
      email,
      display_name: displayName,
      role: 'admin',
      status: 'active',
    })
    const loginVerified = await verifySupabasePasswordLogin(env, email, adminPassword)

    return json({
      success: true,
      login_verified: loginVerified,
      admin: {
        id: authUser.id,
        email,
        display_name: profile?.display_name || displayName,
        role: profile?.role || 'admin',
        status: profile?.status || 'active',
      },
    })
  } catch (error) {
    console.error('Bootstrap admin failed:', error)
    return err(error?.message || 'Failed to bootstrap admin account', 500)
  }
}

async function verifySupabasePasswordLogin(env, email, password) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  return response.ok
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
    provider: ecpayConfigured(env) ? 'ecpay' : 'manual',
    notes: 'Created from sales checkout form',
  })
  const payment = await buildEcpayCheckout(order, env)

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
    ecpay: payment,
    message: '訂單已建立。付款確認後系統會開通學員帳號。',
  })
}

async function handleCreateUpgradeOrder(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const user = await requireUser(request, env)
  const body = await request.json().catch(() => ({}))
  const planId = String(body.planId || '').trim()
  const phone = normalizeTaiwanMobilePhone(body.phone)
  const legacyTier = planToLegacyTier(planId)
  const amount = PLAN_AMOUNT[planId]

  if (!amount || !['creator', 'master'].includes(planId)) return err('Invalid upgrade plan', 400)
  if (!phone) return err('請輸入有效的台灣手機號碼（例：0912-345-678）', 400)

  const profile = await getProfileById(env, user.id)
  if (profile.status === 'inactive') return err('帳號已停用，請聯絡管理員。', 403)

  const currentMembership = await getLatestActiveMembership(env, user.id)
  const currentPlanId = currentMembership?.plan_id || tierToPlanId(currentMembership?.legacy_tier || '') || 'trial'
  const levelByPlan = { trial: 1, creator: 2, master: 3, managed: 4 }
  if ((levelByPlan[planId] || 0) <= (levelByPlan[currentPlanId] || 0)) {
    return err('此方案已包含在目前會員權限內。', 409)
  }

  const order = await insertOrder(env, {
    order_number: makeOrderNumber(),
    user_id: user.id,
    customer_name: profile.display_name || user.user_metadata?.display_name || profile.email?.split('@')[0] || '學員',
    customer_email: profile.email || user.email,
    customer_phone: phone,
    plan_id: planId,
    legacy_tier: legacyTier,
    amount,
    currency: 'TWD',
    status: 'pending',
    provider: ecpayConfigured(env) ? 'ecpay' : 'manual',
    notes: `Created from profile upgrade. Previous plan: ${currentPlanId}`,
  })
  const payment = await buildEcpayCheckout(order, env)

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
    ecpay: payment,
    message: '升級訂單已建立。付款確認後系統會自動升級會員。',
  })
}

async function handleSignContract(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const user = await requireUser(request, env)
  const body = await request.json().catch(() => ({}))
  const profile = await getProfileById(env, user.id)
  if (profile.status === 'inactive') return err('帳號已停用，請聯絡管理員。', 403)

  const planId = String(body.planId || '').trim()
  const billingCycle = String(body.billingCycle || 'annual').trim()
  const signerName = String(body.signerName || body.name || profile.display_name || '').trim()
  const signerEmail = String(body.signerEmail || body.email || profile.email || user.email || '').trim().toLowerCase()
  const signerPhone = normalizeTaiwanMobilePhone(body.signerPhone || body.phone) || String(body.signerPhone || body.phone || '').trim()
  const signerSignatureDataUrl = normalizeSignatureDataUrl(body.signerSignatureDataUrl || body.signatureDataUrl)
  const amount = Number(body.amount || contractAmountFor(planId, billingCycle) || 0)
  const amountLabel = String(body.amountLabel || formatContractAmount(planId, billingCycle, amount)).trim()
  const orderId = String(body.orderId || '').trim()
  const contractDefinition = getContractDefinition(planId)

  if (!['creator', 'master'].includes(planId)) return err('Invalid contract plan', 400)
  if (!['annual', 'monthly'].includes(billingCycle)) return err('Invalid billing cycle', 400)
  if (!signerName || signerName.length < 2) return err('請填寫真實姓名。', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) return err('Email 格式不正確。', 400)
  if (!signerPhone || signerPhone.length < 8) return err('請填寫聯絡電話。', 400)
  if (!signerSignatureDataUrl) return err('請完成電子簽名。', 400)

  const contract = await insertContractSignature(env, {
    user_id: user.id,
    order_id: /^[0-9a-f-]{36}$/i.test(orderId) ? orderId : null,
    contract_version: contractDefinition.version,
    plan_id: planId,
    legacy_tier: planToLegacyTier(planId),
    billing_cycle: billingCycle,
    amount,
    amount_label: amountLabel,
    currency: 'TWD',
    signer_name: signerName,
    signer_email: signerEmail,
    signer_phone: signerPhone,
    signer_identity: String(body.signerIdentity || '').trim() || null,
    signer_address: String(body.signerAddress || '').trim() || null,
    line_id: String(body.lineId || '').trim() || null,
    signer_signature_data_url: signerSignatureDataUrl,
    consent_text: CONTRACT_CONSENT_TEXT,
    ip_address: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '',
    user_agent: request.headers.get('User-Agent') || '',
    status: 'signed',
  })

  return json({ success: true, contract: mapContractSignature(contract) })
}

async function handleListStudentContracts(request, userId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return err('Invalid user id', 400)

  const contracts = await listContractsByUserIds(env, [userId])
  return json({ success: true, contracts: contracts.map(mapContractSignature) })
}

async function handleDownloadContract(request, contractId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  await requireAdmin(request, env)
  if (!/^[0-9a-f-]{36}$/i.test(contractId)) return err('Invalid contract id', 400)

  const contract = await getContractById(env, contractId)
  if (!contract) return err('Contract not found', 404)

  const html = renderContractHtml(contract, env)
  const filename = encodeURIComponent(`頂級流量_${PLAN_LABELS[contract.plan_id] || contract.plan_id}_合作協議書_${contract.signer_name}_${String(contract.signed_at || '').slice(0, 10)}.html`)
  return new Response(html, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
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
  const contracts = await listContractsByUserIds(env, profiles.map(profile => profile.id)).catch(error => {
    if (isMissingContractsTable(error)) return []
    throw error
  })
  const latestContractByUserId = {}
  for (const contract of contracts) {
    if (!latestContractByUserId[contract.user_id]) latestContractByUserId[contract.user_id] = contract
  }
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
      const contract = latestContractByUserId[profile.id] || null
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
        latestContract: contract ? mapContractSignature(contract) : null,
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
  const courseByProgressId = Object.fromEntries(courses.map(course => [progressStorageId(course.id), course]))
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
      const visibleCourseIds = new Set(visibleCourses.map(course => progressStorageId(course.id)))
      const visibleRows = rows.filter(row => visibleCourseIds.has(Number(row.course_id)))
      const totalLessons = visibleCourses.reduce((sum, course) => sum + (Array.isArray(course.lessons) ? course.lessons.length : 0), 0)
      const completedLessons = visibleRows.filter(row => row.completed).length
      const latestRow = visibleRows
        .slice()
        .sort((a, b) => new Date(b.updated_at || b.completed_at || 0) - new Date(a.updated_at || a.completed_at || 0))[0] || null
      const latestCourse = latestRow ? courseByProgressId[Number(latestRow.course_id)] || courseById[Number(latestRow.course_id)] : null
      const latestLesson = latestCourse?.lessons?.find(lesson => progressStorageId(lesson.id) === Number(latestRow.lesson_id) || Number(lesson.id) === Number(latestRow.lesson_id)) || null
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
          const course = courseByProgressId[Number(row.course_id)] || courseById[Number(row.course_id)]
          const lesson = course?.lessons?.find(item => progressStorageId(item.id) === Number(row.lesson_id) || Number(item.id) === Number(row.lesson_id))
          return {
            courseId: course?.id || row.course_id,
            courseTitle: course?.title || `課程 ${row.course_id}`,
            lessonId: lesson?.id || row.lesson_id,
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
  const subject = String(body.subject || '頂級流量課程進度提醒').trim()
  const channel = String(body.channel || 'internal').trim()
  const courseId = body.courseId ? Number(body.courseId) : null
  let targetUserIds = userIds

  if (userIds.length === 0) return err('Missing reminder recipients', 400)
  if (!message) return err('Missing reminder message', 400)
  if (!['internal', 'email'].includes(channel)) return err('Invalid reminder channel', 400)

  let emailResults = []
  if (channel === 'email') {
    if (!env.RESEND_API_KEY) return err('Email 發送服務尚未設定：請先在 Worker 設定 RESEND_API_KEY。', 503)
    const profiles = await listStudentProfiles(env)
    const profileById = Object.fromEntries(profiles.map(profile => [profile.id, profile]))
    const recipients = userIds
      .map(userId => profileById[userId] ? { ...profileById[userId], userId } : null)
      .filter(profile => profile?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))

    if (!recipients.length) return err('找不到可發送 Email 的學員。', 400)
    targetUserIds = recipients.map(profile => profile.userId)
    emailResults = await Promise.all(recipients.map(profile => sendLearningReminderEmail(env, {
      to: profile.email,
      name: profile.display_name || profile.email.split('@')[0] || '學員',
      subject,
      message,
    })))
  }

  const rows = targetUserIds.map(userId => ({
    admin_id: admin.id,
    user_id: userId,
    course_id: Number.isFinite(courseId) ? courseId : null,
    channel,
    message,
    created_at: new Date().toISOString(),
  }))

  const inserted = await insertLearningReminders(env, rows)
  return json({
    success: true,
    count: inserted.length,
    sentCount: emailResults.length,
    reminders: inserted,
    emailResults,
  })
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

async function getRawAIAgent(feature, env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || null
  if (!feature || !env.SUPABASE_URL || !key) return null

  try {
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_agents`)
    url.searchParams.set('feature_key', `eq.${feature}`)
    url.searchParams.set('select', 'feature_key,name,system_prompt,user_prompt_template,enabled,updated_at')
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    const data = await response.json().catch(() => [])
    if (!response.ok) return null
    return Array.isArray(data) && data[0] ? data[0] : null
  } catch (_) {
    return null
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

function mapContractSignature(contract) {
  return {
    id: contract.id,
    userId: contract.user_id,
    orderId: contract.order_id,
    contractVersion: contract.contract_version,
    planId: contract.plan_id,
    planName: PLAN_LABELS[contract.plan_id] || contract.plan_id,
    legacyTier: contract.legacy_tier,
    billingCycle: contract.billing_cycle,
    billingCycleLabel: BILLING_CYCLE_LABELS[contract.billing_cycle] || contract.billing_cycle,
    amount: contract.amount,
    amountLabel: contract.amount_label,
    currency: contract.currency,
    signerName: contract.signer_name,
    signerEmail: contract.signer_email,
    signerPhone: contract.signer_phone,
    signerSignatureDataUrl: contract.signer_signature_data_url,
    consentText: contract.consent_text,
    signedAt: contract.signed_at,
    status: contract.status,
    createdAt: contract.created_at,
    updatedAt: contract.updated_at,
  }
}

function contractAmountFor(planId, billingCycle) {
  if (billingCycle === 'monthly') {
    if (planId === 'creator') return 3980
    if (planId === 'master') return 14800
  }
  return PLAN_AMOUNT[planId] || 0
}

function formatContractAmount(planId, billingCycle, amount) {
  const suffix = billingCycle === 'monthly' ? '／月' : billingCycle === 'annual' ? '／年' : ''
  return `NT$${Number(amount || contractAmountFor(planId, billingCycle) || 0).toLocaleString()}${suffix}`
}

function normalizeSignatureDataUrl(value) {
  const text = String(value || '').trim()
  if (!text || text.length > 180000) return ''
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(text)) return ''
  return text
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function dateZh(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}

function renderParagraphList(items) {
  return (items || []).map((item, index) => `<p>${index + 1}. ${htmlEscape(item)}</p>`).join('\n')
}

function getContractDefinition(planId) {
  if (planId === 'master') {
    return {
      version: MASTER_CONTRACT_VERSION,
      title: '頂流私塾一年陪跑合作協議書',
      versionLabel: '頂流私塾一年陪跑｜NT$129,800 未稅',
      intro: '立合約書人（以下簡稱「甲方」）與遐光映畫工作室（以下簡稱「乙方」），就「頂流私塾一年陪跑」合作案，經雙方協議訂定本合作協議書，以茲共同遵守。',
      projectHeading: '合作項目：短影音一年陪跑頂流私塾。服務期間自甲方完成本合約線上簽署並完成付款後起算一年；如雙方另有約定起訖日，依線上簽署頁面或雙方書面確認之日期為準。',
      projectItems: MASTER_CONTRACT_PROJECT_ITEMS,
      clauses: MASTER_CONTRACT_CLAUSES,
    }
  }

  return {
    version: CONTRACT_VERSION,
    title: '短影音一年達人班合作協議書',
    versionLabel: '短影音一年陪跑達人班｜NT$39,800 未稅',
    intro: '立合約書人（以下簡稱甲方）與遐光映畫工作室（以下簡稱乙方），就「短影音一年陪跑達人班」課程與陪跑服務合作案，經雙方協議訂定本合約，以茲共同信守。',
    projectHeading: '',
    projectItems: CONTRACT_PROJECT_ITEMS,
    clauses: CONTRACT_CLAUSES,
  }
}

function renderContractClausesHtml(clauses = CONTRACT_CLAUSES) {
  return clauses.map(clause => {
    const paragraphs = clause.paragraphs ? renderParagraphList(clause.paragraphs) : ''
    const groups = (clause.groups || []).map(group => `
      <h3>${htmlEscape(group.subtitle)}</h3>
      ${renderParagraphList(group.items)}
    `).join('\n')
    return `
      <h2>${htmlEscape(clause.title)}</h2>
      ${paragraphs}
      ${groups}
    `
  }).join('\n')
}

function renderContractHtml(contract, env = {}) {
  const planName = PLAN_LABELS[contract.plan_id] || contract.plan_id
  const contractDefinition = getContractDefinition(contract.plan_id)
  const billing = BILLING_CYCLE_LABELS[contract.billing_cycle] || contract.billing_cycle
  const amountLabel = contract.amount_label || formatContractAmount(contract.plan_id, contract.billing_cycle, contract.amount)
  const signedAt = dateZh(contract.signed_at)
  const isMonthly = contract.billing_cycle === 'monthly' && contract.plan_id === 'creator'
  const appUrl = String(env.PUBLIC_APP_URL || '').replace(/\/$/, '') || 'https://toplevel-tw.com'
  const companySealUrl = `${appUrl}/contract-assets/xgfx-company-seal.png`
  const quoteUrl = `${appUrl}/contract-assets/${CREATOR_QUOTE_FILE}`

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>${htmlEscape(planName)} 合作協議書 - ${htmlEscape(contract.signer_name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif; color: #15151a; line-height: 1.75; margin: 40px auto; max-width: 880px; padding: 0 28px; }
    h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: .04em; }
    h2 { font-size: 18px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #d8dbe6; }
    h3 { font-size: 15px; margin: 16px 0 6px; }
    p { margin: 8px 0; }
    .subtitle { color: #606575; margin-bottom: 24px; }
    .meta { display: grid; grid-template-columns: 140px 1fr; border: 1px solid #d8dbe6; border-bottom: 0; margin: 16px 0 24px; }
    .meta div { padding: 9px 12px; border-bottom: 1px solid #d8dbe6; }
    .meta div:nth-child(odd) { background: #f6f7fb; font-weight: 700; }
    .party { display: grid; grid-template-columns: 190px 1fr; border: 1px solid #d8dbe6; border-bottom: 0; margin: 14px 0 24px; }
    .party div { padding: 8px 12px; border-bottom: 1px solid #d8dbe6; }
    .party div:nth-child(odd) { background: #fbfbfd; color: #555b6c; }
    .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
    .box { border: 1px solid #d8dbe6; padding: 16px; min-height: 150px; }
    .signature-image { display: block; width: 220px; height: 72px; object-fit: contain; margin: 8px 0 12px; border: 1px solid #e2e5ef; border-radius: 8px; background: #fff; }
    .company-seal { display: block; width: 110px; height: 110px; object-fit: contain; margin: 8px 0 12px; }
    .quote-box { margin: 24px 0; padding: 16px; border: 1px solid #cbd3ef; border-radius: 10px; background: #f7f8ff; }
    .quote-box strong { display: block; margin-bottom: 6px; font-size: 16px; }
    .quote-box a { color: #3448d9; font-weight: 700; }
    .quote-notes { margin: 14px 0; border: 1px solid #d8dbe6; background: #fff; }
    .quote-notes h3 { margin: 0; padding: 10px 12px; text-align: center; color: #fff; background: #333; font-size: 16px; }
    .quote-notes p { margin: 8px 12px 0; font-weight: 700; }
    .quote-notes ol { margin: 8px 12px 14px 34px; padding: 0; font-weight: 700; }
    .quote-notes li { margin: 2px 0; }
    .quote-meta { display: grid; grid-template-columns: 150px 1fr; border: 1px solid #d8dbe6; border-bottom: 0; margin: 12px 0; background: #fff; }
    .quote-meta div { padding: 8px 10px; border-bottom: 1px solid #d8dbe6; }
    .quote-meta div:nth-child(odd) { background: #eef1ff; font-weight: 700; color: #34394c; }
    .quote-signature { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
    .quote-signature .box { background: #fff; }
    .stamp { margin-top: 10px; padding: 10px 12px; background: #f6f7fb; border-radius: 8px; font-weight: 700; }
    .small { color: #606575; font-size: 13px; }
    @media print { body { margin: 0 auto; } }
  </style>
</head>
<body>
  <h1>${htmlEscape(contractDefinition.title)}</h1>
  <p class="subtitle">線上簽署版｜合約版本：${htmlEscape(contract.contract_version || contractDefinition.version)}｜${htmlEscape(contractDefinition.versionLabel)}</p>

  <div class="meta">
    <div>甲方姓名</div><div>${htmlEscape(contract.signer_name)}</div>
    <div>甲方 Email</div><div>${htmlEscape(contract.signer_email)}</div>
    <div>聯絡電話</div><div>${htmlEscape(contract.signer_phone || '')}</div>
    <div>方案</div><div>${htmlEscape(planName)}｜${htmlEscape(billing)}</div>
    <div>合作費用</div><div>${htmlEscape(amountLabel)}${isMonthly ? '（分期/月付由官方 Line@ 協助確認）' : '（線上付款）'}</div>
    <div>簽署時間</div><div>${htmlEscape(signedAt)}</div>
  </div>

  <p>${htmlEscape(contractDefinition.intro)}</p>

  ${isMonthly ? `
  <div class="quote-box">
    <strong>月付 / 分期方案簽署版報價單</strong>
    <p>本合約為月付 / 分期方案，以下為已附客戶聯絡資訊與電子簽名之簽署版報價單，供客服確認與後台留存。</p>
    <div class="quote-notes">
      <h3>注意事項</h3>
      <p>※內容細項：</p>
      <ol>
        <li>一年陪跑學習（報價單簽訂日起算）</li>
        <li>一年內兩次實體課（報價單簽訂日起算）</li>
        <li>每周線上內訓</li>
        <li>短影音商業定位</li>
        <li>個人 IP 內容定位</li>
        <li>爆款選題系統</li>
        <li>腳本寫作訓練</li>
        <li>自然風拍攝技巧</li>
        <li>鏡頭表達訓練</li>
        <li>剪輯與上架優化</li>
        <li>流量數據分析</li>
        <li>變現路徑規劃</li>
      </ol>
    </div>
    <div class="quote-meta">
      <div>客戶姓名</div><div>${htmlEscape(contract.signer_name)}</div>
      <div>客戶 Email</div><div>${htmlEscape(contract.signer_email)}</div>
      <div>聯絡電話</div><div>${htmlEscape(contract.signer_phone || '')}</div>
      <div>報價方案</div><div>一年陪跑達人班</div>
      <div>報價總額</div><div>NT$39,800</div>
      <div>月付金額</div><div>${htmlEscape(amountLabel)}</div>
      <div>簽署時間</div><div>${htmlEscape(signedAt)}</div>
    </div>
    <div class="quote-signature">
      <div class="box">
        <strong>客戶確認簽名</strong>
        ${contract.signer_signature_data_url ? `<img class="signature-image" src="${htmlEscape(contract.signer_signature_data_url)}" alt="客戶報價單簽名">` : ''}
        <p>簽署人：${htmlEscape(contract.signer_name)}</p>
        <p>聯絡電話：${htmlEscape(contract.signer_phone || '')}</p>
      </div>
      <div class="box">
        <strong>乙方資訊</strong>
        <p>遐光映畫工作室｜統一編號：71622113</p>
        <p>負責人：張峻翔</p>
        <img class="company-seal" src="${htmlEscape(companySealUrl)}" alt="遐光映畫工作室印章">
      </div>
    </div>
    <p class="small">原始報價單 PDF：<a href="${htmlEscape(quoteUrl)}" target="_blank" rel="noopener">${htmlEscape(CREATOR_QUOTE_FILE)}</a></p>
  </div>
  ` : ''}

  <h2>甲方客戶聯絡資訊（線上簽署前填寫）</h2>
  <div class="party">
    <div>甲方名稱</div><div>${htmlEscape(contract.signer_name)}</div>
    <div>統一編號 / 身分證字號</div><div>${htmlEscape(contract.signer_identity || '')}</div>
    <div>負責人 / 簽署人</div><div>${htmlEscape(contract.signer_name)}</div>
    <div>聯絡電話</div><div>${htmlEscape(contract.signer_phone || '')}</div>
    <div>電子信箱</div><div>${htmlEscape(contract.signer_email)}</div>
    <div>聯絡地址</div><div>${htmlEscape(contract.signer_address || '')}</div>
    <div>LINE ID / 其他聯絡方式</div><div>${htmlEscape(contract.line_id || '')}</div>
    <div>合約版本</div><div>${htmlEscape(contractDefinition.versionLabel)}</div>
  </div>

  <h2>專案內容</h2>
  ${contractDefinition.projectHeading ? `<p>${htmlEscape(contractDefinition.projectHeading)}</p>` : ''}
  ${renderParagraphList(contractDefinition.projectItems)}

  ${renderContractClausesHtml(contractDefinition.clauses)}

  <p class="stamp">${htmlEscape(contract.consent_text || CONTRACT_CONSENT_TEXT)}</p>

  <h2>線上簽署欄</h2>
  <div class="signature">
    <div class="box">
      <strong>甲方（客戶）</strong>
      <p>名稱：${htmlEscape(contract.signer_name)}</p>
      <p>統一編號 / 身分證字號：${htmlEscape(contract.signer_identity || '')}</p>
      <p>簽署人：${htmlEscape(contract.signer_name)}</p>
      <p>電子信箱：${htmlEscape(contract.signer_email)}</p>
      <p>電話：${htmlEscape(contract.signer_phone || '')}</p>
      ${contract.signer_signature_data_url ? `<img class="signature-image" src="${htmlEscape(contract.signer_signature_data_url)}" alt="甲方親筆簽名">` : ''}
      <p>線上簽署：已親筆簽名確認</p>
      <p>簽署時間：${htmlEscape(signedAt)}</p>
    </div>
    <div class="box">
      <strong>乙方</strong>
      <p>名稱：遐光映畫工作室</p>
      <p>統一編號：71622113</p>
      <p>負責人：張峻翔</p>
      <p>E-mail：xgfxstudio.ks01@gmail.com</p>
      <p>電話：07-2367660</p>
      <img class="company-seal" src="${htmlEscape(companySealUrl)}" alt="遐光映畫工作室印章">
      <p>線上簽署：乙方系統紀錄</p>
      <p>簽署時間：${htmlEscape(signedAt)}</p>
    </div>
  </div>
  <p class="small">遐光映畫工作室｜高雄市苓雅區中山二路 412 號 11 樓之 5｜TEL: 07-2367660｜E-mail: xgfxstudio.ks01@gmail.com｜統一編號：71622113｜負責人：張峻翔</p>
  <p class="small">系統紀錄：contract_id=${htmlEscape(contract.id)}｜user_id=${htmlEscape(contract.user_id)}｜IP=${htmlEscape(contract.ip_address || '')}</p>
</body>
</html>`
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

async function sendLearningReminderEmail(env, { to, name, subject, message }) {
  const appUrl = String(env.PUBLIC_APP_URL || 'https://toplevel-tw.com').replace(/\/$/, '')
  const from = env.EMAIL_FROM || '頂級流量 TOP LEVEL TRAFFIC <hello@toplevel-tw.com>'
  const safeName = String(name || '學員').trim() || '學員'
  const safeMessage = String(message || '').trim()
  const dashboardUrl = `${appUrl}/dashboard/courses`
  const text = [
    `${safeName} 你好，`,
    '',
    safeMessage,
    '',
    `回到課程：${dashboardUrl}`,
    '',
    '頂級流量 TOP LEVEL TRAFFIC',
  ].join('\n')
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Noto Sans TC','Microsoft JhengHei',Arial,sans-serif;line-height:1.8;color:#111827;max-width:640px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 14px;color:#111827;">課程進度提醒</h1>
      <p>${htmlEscape(safeName)} 你好，</p>
      <p>${htmlEscape(safeMessage).replace(/\n/g, '<br>')}</p>
      <p style="margin:24px 0;">
        <a href="${htmlEscape(dashboardUrl)}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">回到課程繼續學習</a>
      </p>
      <p style="font-size:13px;color:#6b7280;">如果按鈕無法開啟，請複製此連結：<br>${htmlEscape(dashboardUrl)}</p>
      <p style="margin-top:24px;color:#6b7280;">頂級流量 TOP LEVEL TRAFFIC</p>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Email 發送失敗：HTTP ${response.status}`)
  }
  return {
    to,
    id: data.id || null,
  }
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

async function insertContractSignature(env, payload) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/contract_signatures`, {
    method: 'POST',
    headers: supabaseServiceHeaders(env, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingContractsTable(data)) {
      throw new Error('合約資料表尚未建立，請先在 Supabase SQL Editor 執行 contract_signatures migration。')
    }
    throw new Error(data.message || 'Failed to save contract signature')
  }
  return Array.isArray(data) ? data[0] : data
}

async function listContractsByUserIds(env, userIds = []) {
  const ids = userIds.filter(Boolean)
  if (!ids.length) return []

  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/contract_signatures`)
  url.searchParams.set('user_id', `in.(${ids.join(',')})`)
  url.searchParams.set('select', 'id,user_id,order_id,contract_version,plan_id,legacy_tier,billing_cycle,amount,amount_label,currency,signer_name,signer_email,signer_phone,signer_identity,signer_address,line_id,signer_signature_data_url,consent_text,signed_at,ip_address,user_agent,status,created_at,updated_at')
  url.searchParams.set('order', 'signed_at.desc')
  url.searchParams.set('limit', '500')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingContractsTable(data)) {
      throw new Error('合約資料表尚未建立，請先在 Supabase SQL Editor 執行 contract_signatures migration。')
    }
    throw new Error(data.message || 'Failed to list contract signatures')
  }
  return Array.isArray(data) ? data : []
}

async function getContractById(env, contractId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/contract_signatures`)
  url.searchParams.set('id', `eq.${contractId}`)
  url.searchParams.set('select', 'id,user_id,order_id,contract_version,plan_id,legacy_tier,billing_cycle,amount,amount_label,currency,signer_name,signer_email,signer_phone,signer_identity,signer_address,line_id,signer_signature_data_url,consent_text,signed_at,ip_address,user_agent,status,created_at,updated_at')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString(), {
    headers: supabaseServiceHeaders(env, { Accept: 'application/json' }),
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    if (isMissingContractsTable(data)) {
      throw new Error('合約資料表尚未建立，請先在 Supabase SQL Editor 執行 contract_signatures migration。')
    }
    throw new Error(data.message || 'Failed to read contract signature')
  }
  return Array.isArray(data) ? data[0] || null : null
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

function isMissingContractsTable(data) {
  const message = String(data?.message || data?.error || data || '')
  return data?.code === 'PGRST205' || message.includes("public.contract_signatures") || message.includes("'contract_signatures'") || message.includes('合約資料表')
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
