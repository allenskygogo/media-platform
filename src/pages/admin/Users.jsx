import { useEffect, useState } from 'react'
import { getUsers, saveUsers, TIER_META } from '../../data/mockData'
import { hasSupabase, supabase, allowLocalFallback } from '../../lib/supabase'

const TIERS = ['basic', 'standard', 'advanced']
const TIER_MARK = { basic: '體驗', standard: '達人', advanced: '進階' }
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

const PROVISION_TIERS = [
  { tier: 'basic', planId: 'trial', label: '體驗課' },
  { tier: 'standard', planId: 'creator', label: '頂流達人' },
  { tier: 'advanced', planId: 'master', label: '頂流私塾' },
]

const TIER_TO_PLAN_ID = Object.fromEntries(PROVISION_TIERS.map(item => [item.tier, item.planId]))

const emptyProvisionForm = {
  name: '',
  email: '',
  password: '',
  tier: 'standard',
  expiresAt: '',
}

export default function UsersAdmin() {
  const [users, setUsers]       = useState(() => getUsers().filter(u => u.role === 'student' && u.tier !== 'managed'))
  const [loading, setLoading]   = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [search, setSearch]     = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [resetUser, setResetUser] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [showProvision, setShowProvision] = useState(false)
  const [provisionForm, setProvisionForm] = useState(emptyProvisionForm)
  const [provisioning, setProvisioning] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg]           = useState('')
  const [err, setErr]           = useState('')

  const filtered = users.filter(u => {
    const matchSearch = u.name.includes(search) || u.email.includes(search)
    const matchTier   = filterTier === 'all' || u.tier === filterTier
    return matchSearch && matchTier
  })

  const flash = (t) => { setErr(''); setMsg(t); setTimeout(() => setMsg(''), 3000) }
  const flashError = (t) => { setMsg(''); setErr(t); setTimeout(() => setErr(''), 5000) }
  const selectedUsers = users.filter(user => selectedIds.includes(user.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every(user => selectedIds.includes(user.id))

  useEffect(() => {
    loadStudents()
  }, [])

  const toDateValue = (value) => value ? String(value).split('T')[0] : ''
  const formatDateOnly = (value) => {
    if (!value) return '尚未起算'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '尚未起算'
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
  const formatDateTime = (value) => {
    if (!value) return '尚無紀錄'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '尚無紀錄'
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getAdminToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('找不到管理員登入 token，請重新登入後台。')
    return token
  }

  const workerJson = async (path, options = {}) => {
    const token = await getAdminToken()
    const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false) {
      throw new Error(data.error || '會員資料更新失敗')
    }
    return data
  }

  const downloadContract = async (contract) => {
    if (!contract?.id) return
    try {
      const token = await getAdminToken()
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/admin/contracts/${encodeURIComponent(contract.id)}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || '下載合約失敗')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `頂級流量_${contract.planName || contract.planId}_合作協議書_${contract.signerName || '學員'}_${String(contract.signedAt || '').slice(0, 10)}.html`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      flashError(error.message || '下載合約失敗')
    }
  }

  const loadStudents = async () => {
    if (!hasSupabase || !supabase) {
      refreshLocalUsers()
      return
    }

    setLoading(true)
    try {
      const data = await workerJson('/api/admin/students')
      setUsers((data.students || []).filter(u => u.role === 'student' && u.tier !== 'managed'))
      setSelectedIds([])
    } catch (error) {
      flashError(error.message || '讀取正式會員失敗')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (user) => {
    setEditUser(user)
    setEditForm({ name: user.name, tier: user.tier, status: user.status, expiresAt: toDateValue(user.expiresAt) })
  }

  const saveEdit = async () => {
    if (hasSupabase && supabase && editUser?.source === 'supabase') {
      setUpdatingId(editUser.id)
      try {
        await workerJson(`/api/admin/students/${encodeURIComponent(editUser.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editForm.name,
            status: editForm.status,
            tier: editForm.tier,
            planId: TIER_TO_PLAN_ID[editForm.tier],
            legacyTier: editForm.tier,
            expiresAt: editForm.expiresAt || null,
          }),
        })
        await loadStudents()
        setEditUser(null)
        flash('正式會員資料已更新')
      } catch (error) {
        flashError(error.message || '更新正式會員失敗')
      } finally {
        setUpdatingId('')
      }
      return
    }

    const all = getUsers()
    const idx = all.findIndex(u => u.id === editUser.id)
    all[idx] = {
      ...all[idx],
      name: editForm.name,
      avatar: editForm.name.charAt(0),
      tier: editForm.tier,
      status: editForm.status,
      expiresAt: editForm.expiresAt || null,
    }
    saveUsers(all)
    setUsers(all.filter(u => u.role === 'student' && u.tier !== 'managed'))
    setEditUser(null)
    flash('學員資料已更新')
  }

  const toggleStatus = async (user) => {
    if (hasSupabase && supabase && user.source === 'supabase') {
      const nextStatus = user.status === 'active' ? 'inactive' : 'active'
      setUpdatingId(user.id)
      try {
        await workerJson(`/api/admin/students/${encodeURIComponent(user.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        })
        await loadStudents()
        flash(`已${nextStatus === 'active' ? '啟用' : '停用'}學員 ${user.name}`)
      } catch (error) {
        flashError(error.message || '更新帳號狀態失敗')
      } finally {
        setUpdatingId('')
      }
      return
    }

    const all = getUsers()
    const idx = all.findIndex(u => u.id === user.id)
    all[idx].status = all[idx].status === 'active' ? 'inactive' : 'active'
    saveUsers(all)
    setUsers(all.filter(u => u.role === 'student' && u.tier !== 'managed'))
    flash(`已${all[idx].status === 'active' ? '啟用' : '停用'}學員 ${user.name}`)
  }

  const openResetPassword = (user) => {
    setResetUser(user)
    setResetPassword('')
  }

  const resetStudentPassword = async (event) => {
    event.preventDefault()
    if (!resetUser || resettingPassword) return
    const password = resetPassword.trim()
    if (password.length < 6) {
      flashError('新密碼至少需要 6 碼。')
      return
    }

    setResettingPassword(true)
    setUpdatingId(resetUser.id)
    try {
      if (hasSupabase && supabase && resetUser.source === 'supabase') {
        await workerJson(`/api/admin/students/${encodeURIComponent(resetUser.id)}/password`, {
          method: 'POST',
          body: JSON.stringify({ password }),
        })
      } else {
        const all = getUsers()
        const idx = all.findIndex(user => user.id === resetUser.id)
        if (idx === -1) throw new Error('找不到學員資料')
        all[idx] = { ...all[idx], password }
        saveUsers(all)
        refreshLocalUsers()
      }
      setResetUser(null)
      setResetPassword('')
      flash(`已重設 ${resetUser.name} 的登入密碼，請將新密碼提供給學員。`)
    } catch (error) {
      flashError(error.message || '重設密碼失敗')
    } finally {
      setResettingPassword(false)
      setUpdatingId('')
    }
  }

  const changeTier = async (user, tier) => {
    if (hasSupabase && supabase && user.source === 'supabase') {
      setUpdatingId(user.id)
      try {
        await workerJson(`/api/admin/students/${encodeURIComponent(user.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tier,
            planId: TIER_TO_PLAN_ID[tier],
            legacyTier: tier,
            expiresAt: null,
          }),
        })
        await loadStudents()
        flash(`${user.name} 已變更為 ${TIER_META[tier]?.label}`)
      } catch (error) {
        flashError(error.message || '更新會員方案失敗')
      } finally {
        setUpdatingId('')
      }
      return
    }

    const all = getUsers()
    const idx = all.findIndex(u => u.id === user.id)
    all[idx].tier = tier
    all[idx].expiresAt = null
    saveUsers(all)
    setUsers(all.filter(u => u.role === 'student' && u.tier !== 'managed'))
    flash(`${user.name} 已變更為 ${TIER_META[tier]?.label}`)
  }

  const refreshLocalUsers = () => {
    const next = getUsers().filter(u => u.role === 'student' && u.tier !== 'managed')
    setUsers(next)
    setSelectedIds(ids => ids.filter(id => next.some(user => user.id === id)))
  }

  const toggleSelected = (userId) => {
    setSelectedIds(ids => ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId])
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds(ids => ids.filter(id => !filtered.some(user => user.id === id)))
      return
    }
    setSelectedIds(ids => [...new Set([...ids, ...filtered.map(user => user.id)])])
  }

  const deleteLocalStudents = (ids) => {
    const all = getUsers().filter(user => !ids.includes(user.id))
    saveUsers(all)
    refreshLocalUsers()
  }

  const deleteStudents = async (targets) => {
    const list = Array.isArray(targets) ? targets : [targets]
    const students = list.filter(Boolean)
    if (!students.length || deleting) return

    const label = students.length === 1
      ? `確定永久刪除學員「${students[0].name}」？刪除後此帳號將無法登入。`
      : `確定永久刪除 ${students.length} 位學員？刪除後這些帳號將無法登入。`
    if (!confirm(label)) return

    setDeleting(true)
    setUpdatingId(students.length === 1 ? students[0].id : '__bulk_delete__')
    try {
      if (hasSupabase && supabase) {
        for (const student of students) {
          await workerJson(`/api/admin/students/${encodeURIComponent(student.id)}`, { method: 'DELETE' })
        }
        await loadStudents()
      } else {
        deleteLocalStudents(students.map(student => student.id))
      }
      setSelectedIds(ids => ids.filter(id => !students.some(student => student.id === id)))
      flash(students.length === 1 ? `已刪除學員 ${students[0].name}` : `已刪除 ${students.length} 位學員`)
    } catch (error) {
      flashError(error.message || '刪除學員失敗')
    } finally {
      setDeleting(false)
      setUpdatingId('')
    }
  }

  const provisionLocalStudent = () => {
    if (!allowLocalFallback) throw new Error('正式環境需要透過 Worker 建立 Supabase 登入帳號。')

    const all = getUsers()
    const email = provisionForm.email.trim().toLowerCase()
    const name = provisionForm.name.trim()
    const password = provisionForm.password.trim()
    const tier = provisionForm.tier
    const today = new Date().toISOString().split('T')[0]
    const expiresAt = provisionForm.expiresAt || null
    const existingIndex = all.findIndex(u => u.email.toLowerCase() === email)

    if (existingIndex >= 0) {
      all[existingIndex] = {
        ...all[existingIndex],
        name,
        password,
        role: 'student',
        tier,
        avatar: name.charAt(0),
        status: 'active',
        expiresAt,
        manualEnrollment: true,
      }
    } else {
      all.push({
        id: Date.now(),
        name,
        email,
        password,
        role: 'student',
        tier,
        avatar: name.charAt(0),
        createdAt: today,
        status: 'active',
        expiresAt,
        manualEnrollment: true,
      })
    }

    saveUsers(all)
    refreshLocalUsers()
  }

  const provisionStudent = async (event) => {
    event.preventDefault()
    if (provisioning) return

    const name = provisionForm.name.trim()
    const email = provisionForm.email.trim().toLowerCase()
    const password = provisionForm.password.trim()

    if (!name || !email || !password) {
      flashError('請填寫姓名、Email 和登入密碼。')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flashError('Email 格式不正確。')
      return
    }
    if (password.length < 6) {
      flashError('登入密碼至少需要 6 碼。')
      return
    }

    const selectedPlan = PROVISION_TIERS.find(item => item.tier === provisionForm.tier)
    setProvisioning(true)
    try {
      if (hasSupabase && supabase) {
        await workerJson('/api/admin/students/provision', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password,
            planId: selectedPlan.planId,
            legacyTier: selectedPlan.tier,
            expiresAt: provisionForm.expiresAt || null,
          }),
        })
        await loadStudents()
      } else {
        provisionLocalStudent()
      }

      setProvisionForm(emptyProvisionForm)
      setShowProvision(false)
      flash(`已開通 ${name}，學員可直接用 ${email} 登入。`)
    } catch (error) {
      flashError(error.message || '開通學員失敗，請稍後再試。')
    } finally {
      setProvisioning(false)
    }
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24 }}>
        <div className="page-heading" style={{ margin: 0 }}><h1>學員管理</h1><p>{loading ? '讀取正式會員中...' : `共 ${users.length} 位學員（不含代操會員）`}</p></div>
        <button className="btn btn-primary" onClick={() => setShowProvision(true)}>
          協助開通已購學員
        </button>
      </div>
      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}
      {err && <div className="auth-alert error" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="搜尋姓名、電子郵件…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        {['all', ...TIERS].map(t => (
          <button key={t} className={`filter-chip ${filterTier === t ? 'active' : ''}`} onClick={() => setFilterTier(t)}>
            {t === 'all' ? '全部' : `${TIER_MARK[t]} ${TIER_META[t]?.label}`}
          </button>
        ))}
        {selectedUsers.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={() => deleteStudents(selectedUsers)} disabled={deleting}>
            {deleting ? '刪除中...' : `刪除已選 ${selectedUsers.length} 位`}
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="admin-students-table">
            <thead>
              <tr>
                <th className="col-select">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} disabled={!filtered.length || loading || deleting} />
                </th>
                <th className="col-student">學員</th><th className="col-email">電子郵件</th><th className="col-tier">會員等級</th><th className="col-expiry">效期</th><th className="col-contract">合約</th><th className="col-login">上次登入</th><th className="col-status">狀態</th><th className="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>讀取正式會員中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>沒有符合條件的學員</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelected(user.id)} disabled={deleting || updatingId === user.id} />
                  </td>
                  <td className="student-cell">
                    <div className="student-identity">
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{user.avatar}</div>
                      <span className="student-name">{user.name}</span>
                    </div>
                  </td>
                  <td className="student-email">{user.email}</td>
                  <td className="tier-cell">
                    <select value={user.tier || 'basic'} onChange={e => changeTier(user, e.target.value)} disabled={updatingId === user.id}
                      className="student-tier-select"
                      style={{
                        background: user.tier === 'basic' ? 'var(--basic-light)' : user.tier === 'standard' ? 'var(--standard-light)' : 'var(--advanced-light)',
                        color: user.tier === 'basic' ? 'var(--basic-text)' : user.tier === 'standard' ? 'var(--standard-text)' : 'var(--advanced-text)', fontWeight: 700 }}>
                      {TIERS.map(t => <option key={t} value={t}>{TIER_MARK[t]} {TIER_META[t]?.label}</option>)}
                    </select>
                  </td>
                  <td className={user.expiresAt && new Date(user.expiresAt) < new Date() ? 'date-cell expired' : 'date-cell'}>
                    {formatDateOnly(user.expiresAt)}
                  </td>
                  <td className="contract-cell">
                    {user.latestContract ? (
                      <div className="contract-stack">
                        <span className="badge badge-active">已簽署</span>
                        <span>{formatDateTime(user.latestContract.signedAt)}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => downloadContract(user.latestContract)}>
                          {user.latestContract.billingCycle === 'monthly' ? '下載合約/報價' : '下載合約'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--gray-400)' }}>未簽署</span>
                    )}
                  </td>
                  <td className={user.lastLoginAt ? 'date-cell' : 'date-cell empty'}>
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <td><span className={`badge badge-${user.status}`}>{user.status === 'active' ? '啟用' : '停用'}</span></td>
                  <td className="actions-cell">
                    <div className="student-row-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(user)} disabled={updatingId === user.id}>編輯</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openResetPassword(user)} disabled={updatingId === user.id}>
                        重設密碼
                      </button>
                      <button className={`btn btn-sm ${user.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(user)} disabled={updatingId === user.id}>
                        {updatingId === user.id ? '更新中...' : user.status === 'active' ? '停用' : '啟用'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteStudents(user)} disabled={deleting || updatingId === user.id}>
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProvision && (
        <div className="modal-overlay" onClick={() => setShowProvision(false)}>
          <form className="modal" onSubmit={provisionStudent} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">協助開通已購學員</h2>
              <button type="button" className="modal-close" onClick={() => setShowProvision(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0, color: 'var(--gray-500)', fontSize: 13 }}>
                用於已經線下購買課程的學員。建立後他們不需要再次付款，可直接用 Email 與密碼登入。
              </p>
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input className="form-input" value={provisionForm.name} onChange={e => setProvisionForm(f => ({ ...f, name: e.target.value }))} placeholder="學員姓名" />
              </div>
              <div className="form-group">
                <label className="form-label">登入 Email</label>
                <input className="form-input" type="email" value={provisionForm.email} onChange={e => setProvisionForm(f => ({ ...f, email: e.target.value }))} placeholder="student@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">預設登入密碼</label>
                <input className="form-input" value={provisionForm.password} onChange={e => setProvisionForm(f => ({ ...f, password: e.target.value }))} placeholder="至少 6 碼，請提供給學員" />
              </div>
              <div className="form-group">
                <label className="form-label">開通方案</label>
                <select className="form-select" value={provisionForm.tier} onChange={e => setProvisionForm(f => ({ ...f, tier: e.target.value }))}>
                  {PROVISION_TIERS.map(item => <option key={item.tier} value={item.tier}>{item.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">效期（選填，留空代表第一次登入才起算）</label>
                <input className="form-input" type="date" value={provisionForm.expiresAt} onChange={e => setProvisionForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowProvision(false)}>取消</button>
              <button type="submit" className="btn btn-primary" disabled={provisioning}>
                {provisioning ? '開通中...' : '建立登入帳號'}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetUser && (
        <div className="modal-overlay" onClick={() => setResetUser(null)}>
          <form className="modal" onSubmit={resetStudentPassword} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">重設學員密碼</h2>
              <button type="button" className="modal-close" onClick={() => setResetUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0, color: 'var(--gray-500)', fontSize: 13 }}>
                正式會員系統不會顯示原密碼。你可以為 {resetUser.name} 設定一組新密碼，再提供給學員登入。
              </p>
              <div className="form-group">
                <label className="form-label">學員 Email</label>
                <input className="form-input" value={resetUser.email} disabled style={{ background: 'var(--gray-50)', color: 'var(--gray-400)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">新密碼</label>
                <input
                  className="form-input"
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="至少 6 碼"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setResetUser(null)}>取消</button>
              <button type="submit" className="btn btn-primary" disabled={resettingPassword}>
                {resettingPassword ? '重設中...' : '確認重設'}
              </button>
            </div>
          </form>
        </div>
      )}

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
              <button className="btn btn-primary" onClick={saveEdit} disabled={updatingId === editUser.id}>
                {updatingId === editUser.id ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
