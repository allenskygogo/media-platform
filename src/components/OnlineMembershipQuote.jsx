import { ONLINE_QUOTE_TITLE, ONLINE_QUOTE_ITEMS, ONLINE_QUOTE_TERMS, ONLINE_QUOTE_CONSENT, ONLINE_QUOTE_FILE } from '../../shared/onlineMembership'

export default function OnlineMembershipQuote({ name, email, phone, signature, signedAt }) {
  return (
    <div className="online-membership-quote">
      <h5>{ONLINE_QUOTE_TITLE}</h5>
      <p>製表日期 / 2026.10.30</p>
      <p>FROM：天生驕傲品牌創意有限公司　TEL：07-2367660</p>
      <p>TO / ATTN：{name || '請填寫真實姓名'}　TEL：{phone || '請填寫手機'}</p>
      <p>Email：{email}</p>
      <p>PROJECT：頂級流量年度線上會員</p>
      <table>
        <thead><tr><th>項次</th><th>會員權益</th><th>服務內容／期限</th></tr></thead>
        <tbody>{ONLINE_QUOTE_ITEMS.map(([item, duration], index) => <tr key={item}><td>{index + 1}</td><td>{item}</td><td>{duration}</td></tr>)}</tbody>
      </table>
      <p>原價 NT$9,800（未稅）<br />本期特惠 NT$6,800（未稅）<br />付款方式：簽約後一次付清含稅總額</p>
      <p>小計（未稅）：NT$9,800　營業稅（5%）：NT$490</p>
      <p><strong>應付總額優惠（含稅）：NT$6,800</strong></p>
      <p>會員起訖：開通通知之次日起算 365 天，起訖日以開通通知確認。</p>
      <p>線上學習、隨到隨學；AI 及年度服務按下列附註第 1、3 點計期。</p>
      <h5>附註：線上會員建議條款</h5>
      {ONLINE_QUOTE_TERMS.map(term => <section className="contract-clause" key={term.title}><h6>{term.title}</h6><p>{term.text}</p></section>)}
      <p>確認聲明：{ONLINE_QUOTE_CONSENT}</p>
      <div className="contract-sign-grid">
        <div><strong>客戶簽名</strong><p>真實姓名：{name || '尚未填寫'}</p><p>Email：{email}</p><p>聯絡電話：{phone || '尚未填寫'}</p>{signature && <img className="contract-signer-signature" src={signature} alt="客戶電子簽名" />}<p>簽署日期：{signedAt ? new Date(signedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '簽署完成時由系統記錄'}</p></div>
        <div><strong>服務方確認</strong><p>天生驕傲品牌創意有限公司</p><p>TEL：07-2367660</p><p>確認日期：{signedAt ? new Date(signedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '簽署完成時由系統記錄'}</p></div>
      </div>
      <a href={`/contract-assets/${ONLINE_QUOTE_FILE}`} download>下載原始報價單（Excel）</a>
    </div>
  )
}
