import { useState, useRef } from 'react'
import { getSalesBlocks, saveSalesBlocks, DEFAULT_SALES_BLOCKS } from '../../data/mockData'

const BLOCK_LABELS = {
  'hero':           '🖼  Hero 大圖橫幅',
  'pain-points':    '😔 三大痛點',
  'trial-intro':    '🎬 試聽課介紹',
  'plan-comparison':'💰 方案比較表',
  'schedule':       '📅 選時段購買（固定）',
  'faq':            '❓ FAQ 常見問題',
  'left-image-right-text': '🖼⬅ 左圖右文',
  'right-image-left-text': '➡🖼 右圖左文',
  'text':           '📝 純文字區塊',
}

// ── Image upload helper (compress → base64) ───────────────────────────────────
function compressImage(file, maxW = 1200, quality = 0.8) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale  = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

// ── Mini Preview of a block ───────────────────────────────────────────────────
function BlockPreview({ block }) {
  const style = {
    background: block.visible ? 'var(--gray-50)' : 'var(--gray-100)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    opacity: block.visible ? 1 : 0.5,
    flex: 1,
    overflow: 'hidden',
  }
  return (
    <div style={style}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', marginBottom:3 }}>
        {BLOCK_LABELS[block.type] || block.type}
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-700)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {block.title || block.type}
      </div>
      {block.subtitle && (
        <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {block.subtitle}
        </div>
      )}
    </div>
  )
}

// ── Block Editor Panel ────────────────────────────────────────────────────────
function BlockEditor({ block, onChange }) {
  const imageRef = useRef()

  const set = (key, val) => onChange({ ...block, [key]: val })

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const b64 = await compressImage(file)
    set('imageUrl', b64)
  }

  const updateFaq = (i, field, val) => {
    const faqs = block.faqs.map((f, idx) => idx === i ? { ...f, [field]: val } : f)
    set('faqs', faqs)
  }
  const addFaq    = ()  => set('faqs', [...(block.faqs||[]), { q:'', a:'' }])
  const removeFaq = (i) => set('faqs', (block.faqs||[]).filter((_,idx) => idx !== i))

  const updatePoint = (i, val) => {
    const points = (block.points||[]).map((p,idx) => idx===i ? val : p)
    set('points', points)
  }
  const addPoint    = ()  => set('points', [...(block.points||[]), ''])
  const removePoint = (i) => set('points', (block.points||[]).filter((_,idx) => idx!==i))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Common fields */}
      <div className="form-group">
        <label className="form-label">標題</label>
        <input className="form-input" value={block.title||''} onChange={e=>set('title',e.target.value)} placeholder="區塊標題" />
      </div>

      {['hero','trial-intro','left-image-right-text','right-image-left-text'].includes(block.type) && (
        <div className="form-group">
          <label className="form-label">副標題 / 說明文字</label>
          <textarea className="form-textarea" rows={3} value={block.subtitle||block.content||''} onChange={e=>set(block.type==='hero'?'subtitle':'content', e.target.value)} placeholder="說明文字" />
        </div>
      )}

      {['hero'].includes(block.type) && (
        <>
          <div className="form-group">
            <label className="form-label">按鈕文字</label>
            <input className="form-input" value={block.buttonText||''} onChange={e=>set('buttonText',e.target.value)} placeholder="例：立即預約試聽課 $399" />
          </div>
          <div className="form-group">
            <label className="form-label">按鈕連結</label>
            <input className="form-input" value={block.buttonLink||''} onChange={e=>set('buttonLink',e.target.value)} placeholder="#schedule" />
          </div>
        </>
      )}

      {['text'].includes(block.type) && (
        <div className="form-group">
          <label className="form-label">內文</label>
          <textarea className="form-textarea" rows={4} value={block.content||''} onChange={e=>set('content',e.target.value)} placeholder="段落文字" />
        </div>
      )}

      {/* Image upload */}
      {['hero','trial-intro','left-image-right-text','right-image-left-text'].includes(block.type) && (
        <div className="form-group">
          <label className="form-label">圖片（自動壓縮）</label>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {block.imageUrl && (
              <img src={block.imageUrl} alt="" style={{ width:80, height:50, objectFit:'cover', borderRadius:'var(--radius-sm)' }} />
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => imageRef.current.click()}>
              {block.imageUrl ? '更換圖片' : '上傳圖片'}
            </button>
            {block.imageUrl && (
              <button className="btn btn-ghost btn-sm" onClick={() => set('imageUrl','')}>移除</button>
            )}
          </div>
          <input ref={imageRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImage} />
          <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:4 }}>支援 JPG、PNG、WebP，自動壓縮至最大 1200px</p>
        </div>
      )}

      {/* Pain points editor */}
      {block.type === 'pain-points' && (
        <div className="form-group">
          <label className="form-label">痛點清單</label>
          {(block.points||[]).map((p, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input className="form-input" value={p} onChange={e=>updatePoint(i,e.target.value)} placeholder={`痛點 ${i+1}`} style={{ flex:1 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => removePoint(i)}>✕</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={addPoint}>＋ 新增痛點</button>
        </div>
      )}

      {/* FAQ editor */}
      {block.type === 'faq' && (
        <div className="form-group">
          <label className="form-label">問答清單</label>
          {(block.faqs||[]).map((item, i) => (
            <div key={i} style={{ background:'var(--gray-50)', borderRadius:'var(--radius-sm)', padding:'12px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)' }}>問答 {i+1}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeFaq(i)}>刪除</button>
              </div>
              <input className="form-input" value={item.q} onChange={e=>updateFaq(i,'q',e.target.value)} placeholder="問題" style={{ marginBottom:8 }} />
              <textarea className="form-textarea" rows={2} value={item.a} onChange={e=>updateFaq(i,'a',e.target.value)} placeholder="解答" />
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={addFaq}>＋ 新增問答</button>
        </div>
      )}
    </div>
  )
}

// ── Main PageBuilder ──────────────────────────────────────────────────────────
export default function PageBuilder() {
  const [blocks,    setBlocks]    = useState(getSalesBlocks)
  const [selected,  setSelected]  = useState(null) // block id
  const [msg,       setMsg]       = useState('')
  const [showAdd,   setShowAdd]   = useState(false)

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const updateBlock = (updated) => setBlocks(bs => bs.map(b => b.id===updated.id ? updated : b))
  const moveUp   = (id) => setBlocks(bs => { const i=bs.findIndex(b=>b.id===id); if(i<=0)return bs; const n=[...bs]; [n[i-1],n[i]]=[n[i],n[i-1]]; return n })
  const moveDown = (id) => setBlocks(bs => { const i=bs.findIndex(b=>b.id===id); if(i>=bs.length-1)return bs; const n=[...bs]; [n[i],n[i+1]]=[n[i+1],n[i]]; return n })
  const toggleVisible = (id) => setBlocks(bs => bs.map(b => b.id===id ? {...b,visible:!b.visible} : b))
  const removeBlock   = (id) => { setBlocks(bs => bs.filter(b => b.id!==id)); if(selected===id) setSelected(null) }

  const addBlock = (type) => {
    const id = `block-${Date.now()}`
    const def = {
      id, type, visible: true, title:'',
      subtitle:'', content:'', buttonText:'', buttonLink:'',
      imageUrl:'', points:['','',''], faqs:[{q:'',a:''}],
    }
    setBlocks(bs => [...bs, def])
    setSelected(id)
    setShowAdd(false)
    flash('已新增區塊')
  }

  const handleSave = () => {
    saveSalesBlocks(blocks)
    flash('已儲存！銷售頁即時生效')
  }

  const handleReset = () => {
    if (!window.confirm('確定要重設為預設版本嗎？所有編輯將會遺失。')) return
    setBlocks(DEFAULT_SALES_BLOCKS)
    saveSalesBlocks(DEFAULT_SALES_BLOCKS)
    setSelected(null)
    flash('已重設為預設版本')
  }

  const selectedBlock = blocks.find(b => b.id === selected)

  return (
    <div>
      <div className="page-actions" style={{ marginBottom:24 }}>
        <div className="page-heading" style={{ margin:0 }}>
          <h1>頁面編輯</h1>
          <p>編輯公開銷售頁的內容與排版，儲存後即時生效</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>重設預設</button>
          <a href="/" target="_blank" className="btn btn-secondary btn-sm">預覽銷售頁 ↗</a>
          <button className="btn btn-primary" onClick={handleSave}>💾 儲存變更</button>
        </div>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom:16 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:24, alignItems:'start' }}>
        {/* ── Left: Block list ── */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body">
              <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>區塊順序</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {blocks.map((b, i) => (
                  <div
                    key={b.id}
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'8px', borderRadius:'var(--radius-sm)',
                      border:`2px solid ${selected===b.id ? 'var(--primary)' : 'var(--gray-200)'}`,
                      background: selected===b.id ? 'var(--primary-light)' : 'var(--white)',
                      cursor:'pointer',
                    }}
                    onClick={() => setSelected(b.id)}
                  >
                    {/* Order buttons */}
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding:'0 4px', fontSize:10 }}
                        onClick={e=>{e.stopPropagation();moveUp(b.id)}} disabled={i===0}>▲</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding:'0 4px', fontSize:10 }}
                        onClick={e=>{e.stopPropagation();moveDown(b.id)}} disabled={i===blocks.length-1}>▼</button>
                    </div>

                    <BlockPreview block={b} />

                    {/* Controls */}
                    <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding:'2px 6px', fontSize:11 }}
                        onClick={e=>{e.stopPropagation();toggleVisible(b.id)}}
                        title={b.visible ? '隱藏' : '顯示'}
                      >{b.visible ? '👁' : '🚫'}</button>
                      {!b.fixed && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding:'2px 6px', fontSize:11, color:'var(--danger)' }}
                          onClick={e=>{e.stopPropagation();removeBlock(b.id)}}
                          title="刪除"
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-secondary w-full" style={{ marginTop:12 }} onClick={() => setShowAdd(true)}>
                ＋ 新增區塊
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Block editor ── */}
        <div>
          {selectedBlock ? (
            <div className="card">
              <div className="card-body">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div>
                    <h3 style={{ fontWeight:700, fontSize:16 }}>{BLOCK_LABELS[selectedBlock.type] || selectedBlock.type}</h3>
                    <p style={{ fontSize:12, color:'var(--gray-400)' }}>ID: {selectedBlock.id}</p>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                      <input type="checkbox" checked={selectedBlock.visible}
                        onChange={() => toggleVisible(selectedBlock.id)} />
                      顯示此區塊
                    </label>
                  </div>
                </div>

                {selectedBlock.fixed ? (
                  <div style={{ background:'var(--gray-50)', borderRadius:'var(--radius)', padding:'24px', textAlign:'center', color:'var(--gray-500)' }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>🔒</div>
                    <p>此為固定區塊（選時段購買），內容不可編輯</p>
                    <p style={{ fontSize:12, marginTop:4 }}>定價設定請至「定價管理」頁面調整</p>
                  </div>
                ) : (
                  <BlockEditor block={selectedBlock} onChange={updateBlock} />
                )}

                <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid var(--gray-100)', display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button className="btn btn-primary" onClick={handleSave}>💾 儲存變更</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body" style={{ textAlign:'center', padding:'64px 32px', color:'var(--gray-400)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🖱</div>
                <p>點選左側區塊開始編輯</p>
                <p style={{ fontSize:12, marginTop:8 }}>或新增新的區塊</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Block Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">新增區塊</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {Object.entries(BLOCK_LABELS).filter(([t]) => t !== 'schedule').map(([type, label]) => (
                  <button
                    key={type}
                    className="btn btn-secondary"
                    style={{ justifyContent:'flex-start', fontSize:13 }}
                    onClick={() => addBlock(type)}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
