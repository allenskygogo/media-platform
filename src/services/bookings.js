import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'
import { getBookings, saveBookings } from '../data/mockData'

function normalizeBooking(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    date: row.date,
    timeSlot: row.time_slot,
    topic: row.topic,
    notes: row.notes || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at,
  }
}

export async function getBookingsRecords({ userId, type } = {}) {
  if (hasSupabase && supabase) {
    let query = supabase
      .from('bookings')
      .select('id, user_id, type, date, time_slot, topic, notes, status, confirmed_at, cancelled_at, created_at, updated_at')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (userId) query = query.eq('user_id', userId)
    if (type && type !== 'all') query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(normalizeBooking)
  }

  if (!allowLocalFallback) throw new Error('Booking storage is not configured')
  return getBookings().filter(item => {
    const matchUser = !userId || item.userId === userId
    const matchType = !type || type === 'all' || item.type === type
    return matchUser && matchType
  })
}

export async function createBookingRecord({ userId, type, date, timeSlot, topic, notes }) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        type,
        date,
        time_slot: timeSlot,
        topic: topic.trim(),
        notes: notes?.trim() || null,
        status: 'pending',
      })
      .select('id, user_id, type, date, time_slot, topic, notes, status, confirmed_at, cancelled_at, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('這個時段已被預約，請選擇其他日期或時段')
      }
      throw error
    }
    return normalizeBooking(data)
  }

  if (!allowLocalFallback) throw new Error('Booking storage is not configured')
  const all = getBookings()
  const record = {
    id: Date.now(),
    userId,
    type,
    date,
    timeSlot,
    topic: topic.trim(),
    notes: notes?.trim() || '',
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
  }
  saveBookings([...all, record])
  return record
}

export async function updateBookingStatusRecord(id, status) {
  if (hasSupabase && supabase) {
    const updates = {
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select('id, user_id, type, date, time_slot, topic, notes, status, confirmed_at, cancelled_at, created_at, updated_at')
      .single()

    if (error) throw error
    return normalizeBooking(data)
  }

  if (!allowLocalFallback) throw new Error('Booking storage is not configured')
  const updated = getBookings().map(item => item.id === id ? { ...item, status } : item)
  saveBookings(updated)
  return updated.find(item => item.id === id)
}

export async function getBookingSubmitterProfiles(userIds) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)))
  if (!ids.length) return []

  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids)

    if (error) throw error
    return (data || []).map(row => ({
      id: row.id,
      name: row.display_name || row.email?.split('@')[0] || '學員',
      email: row.email || '',
    }))
  }

  return []
}
