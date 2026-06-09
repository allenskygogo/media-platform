import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'
import { getLessonProgress, saveLessonProgress } from '../data/mockData'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

function normalizeProgress(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    currentSecond: row.current_second || 0,
    completed: !!row.completed,
    completedAt: row.completed_at,
    watchCount: row.watch_count || 0,
    updatedAt: row.updated_at,
  }
}

async function getAccessToken() {
  if (!supabase) return ''
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || ''
}

function mergeProgressRecords(localRecords, remoteRecords) {
  const byLesson = new Map(localRecords.map(record => [String(record.lessonId), record]))
  for (const record of remoteRecords) {
    const local = byLesson.get(String(record.lessonId))
    if (!local || new Date(record.updatedAt || 0) >= new Date(local.updatedAt || 0)) {
      byLesson.set(String(record.lessonId), record)
    }
  }
  return [...byLesson.values()]
}

async function loadProgressFromWorker(userId, courseId, lessonIds) {
  if (!WORKER_URL || !userId) return []
  const token = await getAccessToken()
  if (!token) return []

  const url = new URL(`${WORKER_URL.replace(/\/$/, '')}/api/course-progress`)
  url.searchParams.set('courseId', String(courseId))
  if (lessonIds.length > 0) {
    url.searchParams.set('lessonIds', lessonIds.map(Number).filter(Number.isFinite).join(','))
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Worker course progress load failed')
  return Array.isArray(payload.progress) ? payload.progress : []
}

async function saveProgressToWorker(userId, courseId, lessonId, currentSecond, completed) {
  if (!WORKER_URL || !userId) return null
  const token = await getAccessToken()
  if (!token) return null

  const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/course-progress`, {
    method: 'POST',
    keepalive: true,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId, lessonId, currentSecond, completed }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Worker course progress save failed')
  return payload.progress || null
}

export async function getCourseProgressRecords(userId, courseId, lessonIds = []) {
  const localRecords = lessonIds
    .map(lessonId => getLessonProgress(userId, courseId, lessonId))
    .filter(Boolean)

  if (hasSupabase && supabase) {
    try {
      const query = supabase
        .from('course_progress')
        .select('user_id, course_id, lesson_id, current_second, completed, completed_at, watch_count, updated_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)

      if (lessonIds.length > 0) {
        query.in('lesson_id', lessonIds)
      }

      const { data, error } = await query
      if (error) throw error
      const remoteRecords = (data || []).map(normalizeProgress)
      return mergeProgressRecords(localRecords, remoteRecords)
    } catch (error) {
      console.error('Remote course progress load failed:', error)
      try {
        const workerRecords = await loadProgressFromWorker(userId, courseId, lessonIds)
        return mergeProgressRecords(localRecords, workerRecords)
      } catch (workerError) {
        console.error('Worker course progress load failed:', workerError)
        return localRecords
      }
    }
  }

  if (!allowLocalFallback) {
    return localRecords
  }

  return localRecords
}

export async function saveCourseProgressRecord(userId, courseId, lessonId, currentSecond, completed = false) {
  const localRecord = saveLessonProgress(userId, Number(courseId), Number(lessonId), currentSecond, completed)
  const workerMirrorPromise = hasSupabase && supabase
    ? saveProgressToWorker(userId, courseId, lessonId, currentSecond, completed).catch(error => {
      console.error('Worker course progress mirror failed:', error)
      return null
    })
    : Promise.resolve(null)

  if (hasSupabase && supabase) {
    const now = new Date().toISOString()
    const basePayload = {
      user_id: userId,
      course_id: Number(courseId),
      lesson_id: Number(lessonId),
      current_second: Math.max(0, Math.floor(currentSecond || 0)),
      last_watched_at: now,
    }

    if (!completed) {
      const { data, error } = await supabase
        .from('course_progress')
        .upsert(basePayload, { onConflict: 'user_id,course_id,lesson_id' })
        .select('user_id, course_id, lesson_id, current_second, completed, completed_at, watch_count, updated_at')
        .single()

      if (error) {
        console.error('Remote course progress save failed:', error)
        try {
          const workerRecord = await workerMirrorPromise
          return workerRecord || localRecord
        } catch {}
        return localRecord
      }
      return normalizeProgress(data)
    }

    const { data: existing, error: existingError } = await supabase
      .from('course_progress')
      .select('watch_count, completed, completed_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (existingError) {
      console.error('Remote course progress lookup failed:', existingError)
      try {
        const workerRecord = await workerMirrorPromise
        return workerRecord || localRecord
      } catch {}
      return localRecord
    }

    const payload = {
      ...basePayload,
      completed: true,
      completed_at: existing?.completed_at || now,
      watch_count: existing?.completed ? (existing.watch_count || 0) : ((existing?.watch_count || 0) + 1),
    }

    const { data, error } = await supabase
      .from('course_progress')
      .upsert(payload, { onConflict: 'user_id,course_id,lesson_id' })
      .select('user_id, course_id, lesson_id, current_second, completed, completed_at, watch_count, updated_at')
      .single()

    if (error) {
      console.error('Remote course progress completion save failed:', error)
      try {
        const workerRecord = await workerMirrorPromise
        return workerRecord || localRecord
      } catch {}
      return localRecord
    }
    return normalizeProgress(data)
  }

  if (!allowLocalFallback) {
    return localRecord
  }

  return localRecord
}
