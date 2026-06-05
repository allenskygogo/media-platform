import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'
import { getLessonProgress, saveLessonProgress } from '../data/mockData'

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
      const byLesson = new Map(localRecords.map(record => [String(record.lessonId), record]))
      for (const record of remoteRecords) {
        const local = byLesson.get(String(record.lessonId))
        if (!local || new Date(record.updatedAt || 0) >= new Date(local.updatedAt || 0)) {
          byLesson.set(String(record.lessonId), record)
        }
      }
      return [...byLesson.values()]
    } catch (error) {
      console.error('Remote course progress load failed:', error)
      return localRecords
    }
  }

  if (!allowLocalFallback) {
    return localRecords
  }

  return localRecords
}

export async function saveCourseProgressRecord(userId, courseId, lessonId, currentSecond, completed = false) {
  const localRecord = saveLessonProgress(userId, Number(courseId), Number(lessonId), currentSecond, completed)

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
      return localRecord
    }
    return normalizeProgress(data)
  }

  if (!allowLocalFallback) {
    return localRecord
  }

  return localRecord
}
