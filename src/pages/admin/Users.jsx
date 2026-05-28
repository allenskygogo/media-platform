import { useState } from 'react'
import { getUsers, saveUsers, addDays, TIER_META } from '../../data/mockData'

const TIERS = ['basic', 'standard', 'advanced']
const TIER_MARK = { basic: '體驗', standard: '達人', advanced: '進階' }

export default function UsersAdmin() {
  const [users, setUsers]       = useState(() => getUsers().filter(u => u.role === 'student' && u.tier !== 'managed'))
  const [search, setSearch]     = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [msg, setMsg]           = useState('')

  const filtered = users.filter(u => {
    const matchSearch = u.name.includes(search) || u.email.includes(search)
    const matchTier   = filterTier === 'all' || u.tier === filterTier
    return matchSearch && matchTier
  })

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const openEdit = (user) => {
    setEditUser(user)
    setEditForm({ name: user.name, tier: user.tier, status: user.status, expiresAt: user.expiresAt || '' })
  }

  const saveEdit = () => {
    const all = getUsers()
    const idx = all.findIndex(u => u.id === editUser.id)
    const days = TIER_META[editForm.tier]?.days
    all[idx] = {
      ...all[idx],
      name: editForm.name,
      avatar: editForm.name.charAt(0),
      tier: editForm.tier,
      status: editForm.status,
      expiresAt: editForm.expiresAt || (days ? addDays(new Date().toISOString().split('T')[0], days) : null),
    }
    saveUsers(all)
    setUsers(all.filter(u => u.role === 'student' && u.tier !== 'managed'))
    setEditUser(null)
    flash('學員資料已更新')
  }

  const toggleStatus = (user) => {
    const all = getUsers()
    const idx = all.findIndex(u => u.id === user.id)
    all[idx].status = all[idx].status === 'active' ? 'inactive' : 'active'
    saveUsers(all)
    setUsers(all.filter(u => u.role === 'student' && u.tier !== 'managed'))
    flash(`已${all[idx].status === 'active' ? '啟用' : '停用'}學員 ${user.name}`)
  }

  const changeTier = (user, tier) => {
    const all = getUsers()
    const idx = all.findIndex(u => u.id === user.id)
    const days = TIER_META[tier]?.days
    all[idx].tier = tier
    if (days) all[idx].expiresAt = addDays(new Date().toISOString().split('T')[0], days)
    saveUsers(all)
    setUsers(all.filter(u => u.role === 'student' && u.tier !== 'managed'))
    flash(`${user.name} 已變更為 ${TIER_META[tier]?.label}`)
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24 }}>
        <div className="page-heading" style={{ margin: 0 }}><h1>學員管理</h1><p>共 {users.length} 位學員（不含代操會員）</p></div>
      </div>
      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="搜尋姓名、電子郵件…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        {['all', ...TIERS].map(t => (
          <button key={t} className={`filter-chip ${filterTier === t ? 'active' : ''}`} onClick={() => setFilterTier(t)}>
            {t === 'all' ? '全部' : `${TIER_MARK[t]} ${TIER_META[t]?.label}`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>學員</th><th>電子郵件</th><th>會員等級</th><th>效期</th><th>狀態</th><th>操作</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>沒有符合條件的學員</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{user.avatar}</div>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{user.email}</td>
                  <td>
                    <select value={user.tier} onChange={e => changeTier(user, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-300)', fontSize: 13, cursor: 'pointer',
                        background: user.tier === 'basic' ? 'var(--basic-light)' : user.tier === 'standard' ? 'var(--standard-light)' : 'var(--advanced-light)',
                        color: user.tier === 'basic' ? 'var(--basic-text)' : user.tier === 'standard' ? 'var(--standard-text)' : 'var(--advanced-text)', fontWeight: 700 }}>
                      {TIERS.map(t => <option key={t} value={t}>{TIER_MARK[t]} {TIER_META[t]?.label}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 13, color: user.expiresAt && new Date(user.expiresAt) < new Date() ? 'var(--danger)' : 'var(--gray-600)' }}>
                    {user.expiresAt || '—'}
                  </td>
                  <td><span className={`badge badge-${user.status}`}>{user.status === 'active' ? '啟用' : '停用'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(user)}>編輯</button>
                      <button className={`btn btn-sm ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(user)}>
                        {user.status === 'active' ? '停用' : '啟用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">編輯學員</h2><button className="modal-close" onClick={() => setEditUser(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">姓名</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">電子郵件</label>
                <input className="form-input" value={editUser.email} disabled style={{ background: 'var(--gray-50)', color: 'var(--gray-400)' }} /><span className="form-hint">電子郵件不可修改</span></div>
              <div className="form-group"><label className="form-label">會員等級</label>
                <select className="form-select" value={editForm.tier} onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))}>
                  {TIERS.map(t => <option key={t} value={t}>{TIER_MARK[t]} {TIER_META[t]?.label}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">效期（留空自動設定）</label>
                <input type="date" className="form-input" value={editForm.expiresAt} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">帳號狀態</label>
                <select className="form-select" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">啟用</option><option value="inactive">停用</option>
                </select></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditUser(null)}>取消</button>
              <button className="btn btn-primary" onClick={saveEdit}>儲存變更</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
