import { useState } from 'react'
import { getUsers, saveUsers, getProjects, saveProjects, getSocialPublishJobs, addDays } from '../../data/mockData'

const EMPTY_USER = { name: '', email: '', password: '', contractExpiry: '', igUsername: '', igFollowers: '', igPosts: '', igLikes: '', ttUsername: '', ttFollowers: '', ttVideos: '', ttViews: '' }
const STATUS_META = { planning: { label: '企劃中', mark: '企' }, filming: { label: '拍攝中', mark: '拍' }, editing: { label: '剪輯中', mark: '剪' }, completed: { label: '已完成', mark: '完' } }

export default function ManagedAdmin() {
  const [managedUsers, setManagedUsers] = useState(() => getUsers().filter(u => u.tier === 'managed'))
  const [projects, setProjects]         = useState(getProjects)
  const [publishJobs]                   = useState(getSocialPublishJobs)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showNewUser, setShowNewUser]   = useState(false)
  const [newUserForm, setNewUserForm]   = useState(EMPTY_USER)
  const [editSocial, setEditSocial]     = useState(null)
  const [socialForm, setSocialForm]     = useState({})
  const [newProject, setNewProject]     = useState({ title: '', notes: '' })
  const [editProject, setEditProject]   = useState(null)
  const [msg, setMsg] = useState('')

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const refreshUsers = () => { const u = getUsers().filter(u => u.tier === 'managed'); setManagedUsers(u); if (selectedUser) setSelectedUser(u.find(x => x.id === selectedUser.id) || null) }

  const createUser = () => {
    const { name, email, password, contractExpiry } = newUserForm
    if (!name.trim() || !email.trim() || !password.trim()) return
    const all = getUsers()
    if (all.find(u => u.email === email)) { flash('此電子郵件已被使用'); return }
    const today = new Date().toISOString().split('T')[0]
    const newU = {
      id: Date.now(), name: name.trim(), email: email.trim(), password: password.trim(),
      role: 'student', tier: 'managed', avatar: name.trim().charAt(0),
      createdAt: today, status: 'active', expiresAt: null,
      contractExpiry: contractExpiry || addDays(today, 365),
      socialAccounts: {
        instagram: { username: newUserForm.igUsername || '', followers: Number(newUserForm.igFollowers) || 0, recentPosts: Number(newUserForm.igPosts) || 0, avgLikes: Number(newUserForm.igLikes) || 0 },
        tiktok:    { username: newUserForm.ttUsername || '', followers: Number(newUserForm.ttFollowers) || 0, recentVideos: Number(newUserForm.ttVideos) || 0, avgViews: Number(newUserForm.ttViews) || 0 },
      },
    }
    saveUsers([...all, newU])
    refreshUsers()
    setShowNewUser(false)
    setNewUserForm(EMPTY_USER)
    flash('代操會員帳號已新增')
  }

  const saveSocial = () => {
    const all = getUsers()
    const idx = all.findIndex(u => u.id === editSocial.id)
    all[idx].socialAccounts = {
      instagram: { username: socialForm.igUsername, followers: Number(socialForm.igFollowers) || 0, recentPosts: Number(socialForm.igPosts) || 0, avgLikes: Number(socialForm.igLikes) || 0 },
      tiktok:    { username: socialForm.ttUsername, followers: Number(socialForm.ttFollowers) || 0, recentVideos: Number(socialForm.ttVideos) || 0, avgViews: Number(socialForm.ttViews) || 0 },
    }
    if (socialForm.contractExpiry) all[idx].contractExpiry = socialForm.contractExpiry
    saveUsers(all)
    refreshUsers()
    setEditSocial(null)
    flash('帳號資訊已更新')
  }

  const addProject = (clientId) => {
    if (!newProject.title.trim()) return
    const today = new Date().toISOString().split('T')[0]
    const p = { id: Date.now(), clientId, title: newProject.title.trim(), status: 'planning', notes: newProject.notes.trim(), createdAt: today, updatedAt: today }
    const updated = [...projects, p]
    saveProjects(updated)
    setProjects(updated)
    setNewProject({ title: '', notes: '' })
    flash('影片專案已新增')
  }

  const updateProjectStatus = (id, status) => {
    const updated = projects.map(p => p.id === id ? { ...p, status, updatedAt: new Date().toISOString().split('T')[0] } : p)
    saveProjects(updated)
    setProjects(updated)
    flash('影片狀態已更新')
  }

  const nuf = (k) => (e) => setNewUserForm(f => ({ ...f, [k]: e.target.value }))
  const sf  = (k) => (e) => setSocialForm(f => ({ ...f, [k]: e.target.value }))

  const userProjects = selectedUser ? projects.filter(p => p.clientId === selectedUser.id) : []
  const userPublishJobs = selectedUser ? publishJobs.filter(job => String(job.userId) === String(selectedUser.id)) : []

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24 }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>代操管理</h1>
          <p>共 {managedUsers.length} 位代操會員</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewUser(true)}>＋ 新增代操帳號</button>
      </div>
      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
        {/* User list */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-header"><h2 className="card-title">客戶列表</h2></div>
          <div style={{ padding: '8px 0' }}>
            {managedUsers.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>尚無代操會員</div>}
            {managedUsers.map(u => (
              <div key={u.id} onClick={() => setSelectedUser(u)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', background: selectedUser?.id === u.id ? 'var(--managed-light)' : undefined, borderBottom: '1px solid var(--gray-100)', transition: 'var(--transition)' }}>
                <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--managed), #f472b6)', width: 32, height: 32, fontSize: 13 }}>{u.avatar}</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: selectedUser?.id === u.id ? 'var(--managed-text)' : 'var(--gray-800)' }}>{u.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>效期：{u.contractExpiry || '未設定'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Social accounts */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">社群帳號資訊</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditSocial(selectedUser); setSocialForm({ igUsername: selectedUser.socialAccounts?.instagram?.username || '', igFollowers: selectedUser.socialAccounts?.instagram?.followers || '', igPosts: selectedUser.socialAccounts?.instagram?.recentPosts || '', igLikes: selectedUser.socialAccounts?.instagram?.avgLikes || '', ttUsername: selectedUser.socialAccounts?.tiktok?.username || '', ttFollowers: selectedUser.socialAccounts?.tiktok?.followers || '', ttVideos: selectedUser.socialAccounts?.tiktok?.recentVideos || '', ttViews: selectedUser.socialAccounts?.tiktok?.avgViews || '', contractExpiry: selectedUser.contractExpiry || '' }) }}>編輯</button>
              </div>
              <div className="card-body">
                {selectedUser.socialAccounts ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
                    {[
                      { label: 'IG 帳號', val: selectedUser.socialAccounts.instagram.username },
                      { label: 'IG 粉絲', val: selectedUser.socialAccounts.instagram.followers?.toLocaleString() },
                      { label: 'TikTok 帳號', val: selectedUser.socialAccounts.tiktok.username },
                      { label: 'TikTok 粉絲', val: selectedUser.socialAccounts.tiktok.followers?.toLocaleString() },
                      { label: '合約效期', val: selectedUser.contractExpiry || '未設定' },
                      { label: '帳號信箱', val: selectedUser.email },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>尚未設定帳號資訊，請點擊編輯按鈕。</p>}
              </div>
            </div>

            {/* Video projects */}
            <div className="card">
              <div className="card-header"><h2 className="card-title">影片製作進度</h2></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Add project */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" placeholder="新增影片專案名稱…" value={newProject.title} onChange={e => setNewProject(f => ({ ...f, title: e.target.value }))} style={{ flex: 1 }} />
                  <input className="form-input" placeholder="備註" value={newProject.notes} onChange={e => setNewProject(f => ({ ...f, notes: e.target.value }))} style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => addProject(selectedUser.id)} disabled={!newProject.title.trim()}>新增</button>
                </div>
                {/* Project list */}
                {userProjects.length === 0 ? <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: 12 }}>尚無影片專案</p> :
                  userProjects.map(p => {
                    const m = STATUS_META[p.status]
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>{p.title}</p>
                          {p.notes && <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{p.notes}</p>}
                        </div>
                        <select value={p.status} onChange={e => updateProjectStatus(p.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-300)', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.mark} {v.label}</option>)}
                        </select>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="card-title">一鍵發布任務</h2></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {userPublishJobs.length === 0 ? <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: 12 }}>尚無發布任務</p> :
                  userPublishJobs.map(job => (
                    <div key={job.id} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{job.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>{job.videoName} · {job.createdAt}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {(job.targets || []).map(target => (
                          <span key={target.platform} className={`badge ${target.status === 'ready' ? 'badge-advanced' : 'badge-warning'}`}>
                            {target.platform} · {target.status === 'ready' ? '待發布' : '待串接'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state"><div className="empty-state-icon"></div><h3>選擇客戶</h3><p>從左側列表選擇一位代操會員來管理</p></div>
        )}
      </div>

      {/* New user modal */}
      {showNewUser && (
        <div className="modal-overlay" onClick={() => setShowNewUser(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">新增代操會員帳號</h2><button className="modal-close" onClick={() => setShowNewUser(false)}>×</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>帳號基本資訊</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[['name','姓名 *',''], ['email','電子郵件 *',''], ['password','登入密碼 *',''], ['contractExpiry','合約效期','date']].map(([k, lbl, type]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{lbl}</label>
                    <input className="form-input" type={type || 'text'} value={newUserForm[k]} onChange={nuf(k)} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Instagram 資訊</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[['igUsername','IG 帳號名稱'], ['igFollowers','粉絲數'], ['igPosts','近期貼文數'], ['igLikes','平均讚數']].map(([k, lbl]) => (
                  <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="form-input" value={newUserForm[k]} onChange={nuf(k)} /></div>
                ))}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>TikTok 資訊</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['ttUsername','TikTok 帳號名稱'], ['ttFollowers','粉絲數'], ['ttVideos','近期影片數'], ['ttViews','平均觀看數']].map(([k, lbl]) => (
                  <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="form-input" value={newUserForm[k]} onChange={nuf(k)} /></div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewUser(false)}>取消</button>
              <button className="btn btn-primary" onClick={createUser} disabled={!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()}>建立帳號</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit social modal */}
      {editSocial && (
        <div className="modal-overlay" onClick={() => setEditSocial(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">編輯帳號資訊 — {editSocial.name}</h2><button className="modal-close" onClick={() => setEditSocial(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">合約效期</label>
                <input type="date" className="form-input" value={socialForm.contractExpiry} onChange={sf('contractExpiry')} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Instagram</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[['igUsername','帳號'], ['igFollowers','粉絲數'], ['igPosts','近期貼文'], ['igLikes','平均讚數']].map(([k, lbl]) => (
                  <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="form-input" value={socialForm[k] || ''} onChange={sf(k)} /></div>
                ))}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>TikTok</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['ttUsername','帳號'], ['ttFollowers','粉絲數'], ['ttVideos','近期影片'], ['ttViews','平均觀看']].map(([k, lbl]) => (
                  <div key={k} className="form-group"><label className="form-label">{lbl}</label><input className="form-input" value={socialForm[k] || ''} onChange={sf(k)} /></div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditSocial(null)}>取消</button>
              <button className="btn btn-primary" onClick={saveSocial}>儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
