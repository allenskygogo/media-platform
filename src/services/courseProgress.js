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
  if (hasSupabase && supabase) {
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
    return (data || []).map(normalizeProgress)
  }

  if (!allowLocalFallback) {
    throw new Error('Course progress storage is not configured')
  }

  return lessonIds
    .map(lessonId => getLessonProgress(userId, courseId, lessonId))
    .filter(Boolean)
}

export async function saveCourseProgressRecord(userId, courseId, lessonId, currentSecond, completed = false) {
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

      if (error) throw error
      return normalizeProgress(data)
    }

    const { data: existing, error: existingError } = await supabase
      .from('course_progress')
      .select('watch_count, completed, completed_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (existingError) throw existingError

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

    if (error) throw error
    return normalizeProgress(data)
  }

  if (!allowLocalFallback) {
    throw new Error('Course progress storage is not configured')
  }

  return saveLessonProgress(userId, courseId, lessonId, currentSecond, completed)
}
