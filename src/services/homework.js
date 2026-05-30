import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'
import {
  getHomeworkSpecs,
  getHomeworkSpec,
  saveHomeworkSpec,
  getAllHomework,
  getLatestHomework,
  submitHomework,
  approveHomework,
  rejectHomework,
} from '../data/mockData'

function normalizeSpec(row) {
  if (!row) return null
  return {
    lessonId: row.lesson_id,
    spec: row.spec,
    updatedAt: row.updated_at,
  }
}

function normalizeSubmission(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    videoUrl: row.url,
    note: row.text,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.feedback,
    reviewedBy: row.reviewed_by,
  }
}

export async function getHomeworkSpecsRecords() {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_specs')
      .select('lesson_id, spec, updated_at')

    if (error) throw error
    return (data || []).map(normalizeSpec)
  }

  if (!allowLocalFallback) throw new Error('Homework specs storage is not configured')
  return getHomeworkSpecs()
}

export async function getHomeworkSpecRecord(lessonId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_specs')
      .select('lesson_id, spec, updated_at')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (error) throw error
    return normalizeSpec(data)
  }

  if (!allowLocalFallback) throw new Error('Homework specs storage is not configured')
  return getHomeworkSpec(lessonId)
}

export async function saveHomeworkSpecRecord(lessonId, spec) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_specs')
      .upsert({ lesson_id: lessonId, spec: spec.trim() }, { onConflict: 'lesson_id' })
      .select('lesson_id, spec, updated_at')
      .single()

    if (error) throw error
    return normalizeSpec(data)
  }

  if (!allowLocalFallback) throw new Error('Homework specs storage is not configured')
  saveHomeworkSpec(lessonId, spec)
  return getHomeworkSpec(lessonId)
}

export async function getHomeworkSubmissionsRecords() {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select('id, user_id, course_id, lesson_id, url, text, status, feedback, reviewed_by, reviewed_at, submitted_at')
      .order('submitted_at', { ascending: false })

    if (error) throw error
    return (data || []).map(normalizeSubmission)
  }

  if (!allowLocalFallback) throw new Error('Homework submissions storage is not configured')
  return getAllHomework()
}

export async function getLatestHomeworkRecord(userId, courseId, lessonId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select('id, user_id, course_id, lesson_id, url, text, status, feedback, reviewed_by, reviewed_at, submitted_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return normalizeSubmission(data)
  }

  if (!allowLocalFallback) throw new Error('Homework submissions storage is not configured')
  return getLatestHomework(userId, courseId, lessonId)
}

export async function getHomeworkSubmissionsForCourse(userId, courseId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select('id, user_id, course_id, lesson_id, url, text, status, feedback, reviewed_by, reviewed_at, submitted_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('submitted_at', { ascending: false })

    if (error) throw error
    return (data || []).map(normalizeSubmission)
  }

  if (!allowLocalFallback) throw new Error('Homework submissions storage is not configured')
  return getAllHomework().filter(item => item.userId === userId && item.courseId === courseId)
}

export async function submitHomeworkRecord(userId, courseId, lessonId, videoUrl, note) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .insert({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        url: videoUrl.trim(),
        text: note.trim() || null,
        status: 'pending',
      })
      .select('id, user_id, course_id, lesson_id, url, text, status, feedback, reviewed_by, reviewed_at, submitted_at')
      .single()

    if (error) throw error
    return normalizeSubmission(data)
  }

  if (!allowLocalFallback) throw new Error('Homework submissions storage is not configured')
  submitHomework(userId, courseId, lessonId, videoUrl, note)
  return getLatestHomework(userId, courseId, lessonId)
}

export async function approveHomeworkRecord(submissionId, reviewerId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        status: 'approved',
        reviewed_by: reviewerId || null,
        reviewed_at: new Date().toISOString(),
        feedback: null,
      })
      .eq('id', submissionId)
      .select('id, user_id, course_id, lesson_id, url, text, status, feedback, reviewed_by, reviewed_at, submitted_at')
      .single()

    if (error) throw error
    return normalizeSubmission(data)
  }

  if (!allowLocalFallback) throw new Error('Homework submissions storage is not configured')
  approveHomework(submissionId)
  return getAllHomework().find(item => item.id === submissionId)
}

export async function rejectHomeworkRecord(submissionId, reason, reviewerId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('homework_submissions')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId || null,
        reviewed_at: new Date().toISOString(),
        feedback: reason,
      })
      .eq('id', submissionId)
      .select('id, user_id, course_id, lesson_id, url, text, status, feedback, reviewed_by, reviewed_at, submitted_at')
      .single()

    if (error) throw error
    return normalizeSubmission(data)
  }

  if (!allowLocalFallback) throw new Error('Homework submissions storage is not configured')
  rejectHomework(submissionId, reason)
  return getAllHomework().find(item => item.id === submissionId)
}
