# 企劃定位站內對話

「企劃定位」以站內對話介面呼叫 `/api/ai/planning/conversation`，不嵌入或跳轉 ChatGPT。使用者提供的 GPT 指令保存在 Supabase `ai_agents` 的 `planning` 設定，並加入 `企劃定位知識庫.docx` 完整抽取的 4,088 字參考文字。原始指令和知識內容不放入前端套件或此儲存庫。

本次使用網站既有 Responses API 服務，預設沿用 `gpt-4.1-mini`，不是直接呼叫 GPT 分享網址。設定可由既有「AI Agent 管理」維護。當前無即時網路搜尋工具，策略推估與未查證數字規則保留。

端點驗證登入、帳號狀態、最新有效會員與期限，僅接受交錯的 user/assistant 訊息。企劃功能不可經由原本未驗證登入的通用 `/api/ai` 入口呼叫。停用或缺少企劃設定時回傳錯誤，不產生模擬回覆。每次附上對話歷史，並使用 `store: false`。

畫面有使用者提供的五個啟動範例、送出狀態、失敗時保留輸入、局部修改追問，以及新對話按鈕。對話與草稿按使用者 ID 存於本分頁 sessionStorage，切換工具或重新整理後可繼續；關閉分頁後不提供伺服器歷史同步。

驗證：`node --test tests/planning-conversation.test.js tests/member-access.test.js`、`npm run build`、`node --check worker/index.js`。另以正式會員實測資訊蒐集、完整企劃、指定區塊修改。
