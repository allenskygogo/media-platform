import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'
import { getBookings, saveBookings } from '../data/mockData'
import { BOOKING_TIME_SLOTS } from '../data/bookingSlots'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'
const BOOKING_DURATION_MINUTES = 180

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
  const unavailableSlots = await getUnavailableBookingSlots(type, date)
  if (unavailableSlots.includes(timeSlot)) {
    throw new Error('這個時段已滿，請選擇其他時間')
  }

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

export async function updateBookingDetailsRecord(id, { type, date, timeSlot, topic, notes }) {
  const conflictSlots = await getBookingConflictSlots({ type, date, ignoreBookingId: id })
  const calendarSlots = await getCalendarUnavailableSlots(type, date)

  if ([...conflictSlots, ...calendarSlots].includes(timeSlot)) {
    throw new Error('這個時段已滿，請選擇其他時間')
  }

  const updates = {
    date,
    time_slot: timeSlot,
    topic: topic.trim(),
    notes: notes?.trim() || null,
  }

  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
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
  const updated = getBookings().map(item => item.id === id ? {
    ...item,
    date,
    timeSlot,
    topic: topic.trim(),
    notes: notes?.trim() || '',
  } : item)
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

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

function getBookingSlotRange(date, slot) {
  const start = new Date(`${date}T${slot}:00+08:00`)
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60 * 1000)
  return { start, end }
}

async function getBookingConflictSlots({ type, date, ignoreBookingId }) {
  const allowedSlots = BOOKING_TIME_SLOTS.map(slot => slot.key)
  let records = []

  if (hasSupabase && supabase) {
    let query = supabase
      .from('bookings')
      .select('id, type, date, time_slot, status')
      .eq('type', type)
      .eq('date', date)
      .neq('status', 'cancelled')

    if (ignoreBookingId) query = query.neq('id', ignoreBookingId)

    const { data, error } = await query
    if (error) throw error
    records = data || []
  } else if (allowLocalFallback) {
    records = getBookings()
      .filter(item => item.type === type && item.date === date && item.status !== 'cancelled' && item.id !== ignoreBookingId)
      .map(item => ({ id: item.id, time_slot: item.timeSlot }))
  }

  return allowedSlots.filter(slot => {
    const candidateRange = getBookingSlotRange(date, slot)
    return records.some(record => {
      const bookedRange = getBookingSlotRange(date, record.time_slot)
      return rangesOverlap(candidateRange.start, candidateRange.end, bookedRange.start, bookedRange.end)
    })
  })
}

async function getSupabaseUnavailableSlots(type, date) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase.rpc('get_unavailable_booking_slots', {
      p_type: type,
      p_date: date,
    })

    if (error) throw error
    return (data || []).map(row => row.time_slot).filter(Boolean)
  }

  if (!allowLocalFallback) return []
  return getBookings()
    .filter(item => item.type === type && item.date === date && item.status !== 'cancelled')
    .map(item => item.timeSlot)
}

async function getCalendarUnavailableSlots(type, date) {
  if (!WORKER_URL) {
    if (import.meta.env.DEV) return []
    throw new Error('Google 行事曆防撞期尚未設定')
  }

  const url = new URL(`${WORKER_URL.replace(/\/$/, '')}/api/calendar/availability`)
  url.searchParams.set('type', type)
  url.searchParams.set('date', date)
  url.searchParams.set('durationMinutes', String(BOOKING_DURATION_MINUTES))

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Google 行事曆可用時段讀取失敗')
  const data = await response.json()
  if (data.success === false) throw new Error(data.error || 'Google 行事曆可用時段讀取失敗')
  if (data.calendarConfigured === false) throw new Error('Google 行事曆防撞期尚未設定')
  return Array.isArray(data.unavailableSlots) ? data.unavailableSlots : []
}

export async function getUnavailableBookingSlots(type, date) {
  if (!type || !date) return []

  const [bookingSlots, calendarSlots] = await Promise.all([
    getSupabaseUnavailableSlots(type, date),
    getCalendarUnavailableSlots(type, date),
  ])

  const allowed = new Set(BOOKING_TIME_SLOTS.map(slot => slot.key))
  return Array.from(new Set([...bookingSlots, ...calendarSlots]))
    .filter(slot => allowed.has(slot))
}
