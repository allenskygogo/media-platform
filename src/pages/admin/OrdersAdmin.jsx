import { useEffect, useState } from 'react'
import { hasSupabase, supabase } from '../../lib/supabase'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

const STATUS_LABEL = {
  pending: '待付款',
  paid: '已付款',
  cancelled: '已取消',
}

const PLAN_LABEL = {
  trial: '自媒體獲客-定位體驗課',
  creator: '頂流達人',
  master: '頂流私塾',
}

function normalizeOrderError(error) {
  const message = String(error?.message || '')
  if (message.includes('public.orders') || message.includes('schema cache') || message.includes('orders migration')) {
    return '訂單資料表尚未建立，請先在 Supabase SQL Editor 執行 orders migration。'
  }
  return message || '訂單操作失敗'
}

function money(value, currency = 'TWD') {
  return `${currency === 'TWD' ? 'NT$' : currency} ${Number(value || 0).toLocaleString()}`
}

function dateText(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-TW')
}

export default function OrdersAdmin() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const selectedOrders = orders.filter(order => selectedIds.includes(order.id))
  const allSelected = orders.length > 0 && orders.every(order => selectedIds.includes(order.id))

  const flash = (text) => {
    setErr('')
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const flashError = (text) => {
    setMsg('')
    setErr(text)
    setTimeout(() => setErr(''), 5000)
  }

  const getAdminToken = async ({ refresh = false } = {}) => {
    const { data: sessionData } = refresh
      ? await supabase.auth.refreshSession()
      : await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('找不到管理員登入 token，請重新登入後台。')
    return token
  }

  const isInvalidTokenError = (data) => String(data?.error || data?.message || '').includes('Invalid authorization token')

  const workerJson = async (path, options = {}) => {
    const request = async (token) => {
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      })
      const data = await response.json().catch(() => ({}))
      return { response, data }
    }

    let { response, data } = await request(await getAdminToken())
    if ((!response.ok || data.success === false) && isInvalidTokenError(data)) {
      ;({ response, data } = await request(await getAdminToken({ refresh: true })))
    }
    if (!response.ok || data.success === false) {
      throw new Error(isInvalidTokenError(data) ? '登入狀態已過期，請重新整理或重新登入後台。' : data.error || '訂單操作失敗')
    }
    return data
  }

  const loadOrders = async () => {
    if (!hasSupabase || !supabase) {
      flashError('正式訂單需要 Supabase 與 Worker 才能讀取。')
      return
    }

    setLoading(true)
    try {
      const data = await workerJson('/api/admin/orders')
      setOrders(data.orders || [])
      setSelectedIds(ids => ids.filter(id => (data.orders || []).some(order => order.id === id)))
    } catch (error) {
      flashError(normalizeOrderError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const updateStatus = async (order, status) => {
    setUpdatingId(order.id)
    try {
      await workerJson(`/api/admin/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await loadOrders()
      flash(status === 'paid' ? `已確認付款並開通 ${order.customerName}` : '訂單狀態已更新')
    } catch (error) {
      flashError(normalizeOrderError(error))
    } finally {
      setUpdatingId('')
    }
  }

  const toggleSelected = (orderId) => {
    setSelectedIds(ids => ids.includes(orderId) ? ids.filter(id => id !== orderId) : [...ids, orderId])
  }

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : orders.map(order => order.id))
  }

  const deleteOrders = async (target) => {
    const targets = Array.isArray(target) ? target : [target]
    if (targets.length === 0) return
    const label = targets.length === 1
      ? `確定刪除訂單「${targets[0].orderNumber}」？此操作只會刪除訂單紀錄，不會刪除學員帳號。`
      : `確定刪除 ${targets.length} 筆訂單？此操作只會刪除訂單紀錄，不會刪除學員帳號。`
    if (!confirm(label)) return

    setDeleting(true)
    setUpdatingId(targets.length === 1 ? targets[0].id : '__bulk_delete__')
    try {
      for (const order of targets) {
        await workerJson(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' })
      }
      await loadOrders()
      setSelectedIds(ids => ids.filter(id => !targets.some(order => order.id === id)))
      flash(targets.length === 1 ? `已刪除訂單 ${targets[0].orderNumber}` : `已刪除 ${targets.length} 筆訂單`)
    } catch (error) {
      flashError(normalizeOrderError(error))
    } finally {
      setDeleting(false)
      setUpdatingId('')
    }
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24 }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>訂單管理</h1>
          <p>{loading ? '讀取訂單中...' : `共 ${orders.length} 筆訂單`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedOrders.length > 0 && (
            <button className="btn btn-danger" onClick={() => deleteOrders(selectedOrders)} disabled={deleting}>
              {deleting ? '刪除中...' : `刪除已選 ${selectedOrders.length} 筆`}
            </button>
          )}
          <button className="btn btn-secondary" onClick={loadOrders} disabled={loading}>重新整理</button>
        </div>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}
      {err && <div className="auth-alert error" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 42 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={!orders.length || loading || deleting} />
                </th>
                <th>訂單</th>
                <th>學員</th>
                <th>方案</th>
                <th>金額</th>
                <th>狀態</th>
                <th>建立時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>讀取訂單中...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>目前沒有訂單</td></tr>
              ) : orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelected(order.id)} disabled={deleting || updatingId === order.id} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{order.orderNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{order.provider}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{order.customerEmail}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{order.customerPhone || '-'}</div>
                  </td>
                  <td>{PLAN_LABEL[order.planId] || order.planId}</td>
                  <td>{money(order.amount, order.currency)}</td>
                  <td><span className={`badge badge-${order.status}`}>{STATUS_LABEL[order.status] || order.status}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{dateText(order.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {order.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" disabled={updatingId === order.id} onClick={() => updateStatus(order, 'paid')}>
                            {updatingId === order.id ? '開通中...' : '確認付款開通'}
                          </button>
                          <button className="btn btn-danger btn-sm" disabled={updatingId === order.id} onClick={() => updateStatus(order, 'cancelled')}>
                            取消
                          </button>
                        </>
                      )}
                      {order.status === 'paid' && <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>已於 {dateText(order.paidAt)} 開通</span>}
                      {order.status === 'cancelled' && (
                        <button className="btn btn-secondary btn-sm" disabled={updatingId === order.id} onClick={() => updateStatus(order, 'pending')}>
                          恢復待付款
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" disabled={deleting || updatingId === order.id} onClick={() => deleteOrders(order)}>
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
    </div>
  )
}
