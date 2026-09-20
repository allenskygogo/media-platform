export const AI_FEATURE_LABELS = {
  planning: '企劃定位', topics: '爆款選題', script: '爆款腳本', social: '社群貼文', material: '素材靈感',
  shooting: '拍攝形式', marketing: '行銷文案', livestream: '直播話術', analysis: '爆款解析',
  trending: '流量熱點', chat: '頂流助理', benchmark: '對標分析',
}

// Keep only a short excerpt from this question, never a conversation or AI reply.
export function questionExcerpt(value, max = 160) {
  const text = String(value || '').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[Email]')
    .replace(/https?:\/\/\S+/gi, '[連結]').replace(/(?:\+886[- ]?9|09)\d{2}[- ]?\d{3}[- ]?\d{3}/g, '[電話]')
    .replace(/\s+/g, ' ').trim()
  return Array.from(text).slice(0, max).join('') + (Array.from(text).length > max ? '…' : '')
}

export function questionTopics(value, feature) {
  const text = String(value || '')
  const rules = [
    ['帳號定位', /定位|人設|差異化|品牌特色/], ['目標客群', /客群|受眾|目標客戶/],
    ['帳號名稱與簡介', /帳號名|名稱|命名|簡介|大頭照/], ['內容更新策略', /更新|頻率|三個月|90\s*天|第一個月|第二個月|第三個月|排程/],
    ['獲客與成交', /獲客|成交|招募|轉換|訂單|來店|客戶/], ['變現規劃', /變現|定價|客單價|收費|營收/],
    ['選題與腳本', /選題|題目|題庫|腳本|鉤子|開頭/], ['社群貼文', /貼文|社群文案|發文/],
    ['拍攝與素材', /拍攝|拍片|素材|鏡頭|剪輯/], ['市場與行業分析', /市場|行業|產業|痛點|趨勢|競爭/],
  ]
  const topics = rules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label)
  return topics.length ? topics.slice(0, 4) : [AI_FEATURE_LABELS[feature] || '其他提問']
}

export function newestUsageFirst(records) {
  return [...records].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || String(b.id || '').localeCompare(String(a.id || '')))
}

export function usageSummary(record) {
  const summary = questionExcerpt(record.question_summary || record.input_payload?.question_summary || record.industry || record.input_payload?.source || record.input_payload?.topicText || record.input_payload?.idea || record.input_payload?.text)
  return { ...record, question_summary: summary,
    topics: questionTopics(summary, record.feature),
    plan: record.input_payload?.membership_plan || record.plan }
}
