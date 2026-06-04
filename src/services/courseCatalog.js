import { supabase } from '../lib/supabase'
import {
  CF_VIDEOS_KEY,
  COURSES_KEY,
  VIDEO_ASSIGN_KEY,
  getCFVideos,
  getCourses,
  getVideoAssignments,
  saveCourses,
} from '../data/mockData'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

function normalizeCatalog(catalog = {}) {
  return {
    courses: Array.isArray(catalog.courses) ? catalog.courses : [],
    cfVideos: Array.isArray(catalog.cfVideos) ? catalog.cfVideos : [],
    videoAssignments: catalog.videoAssignments && typeof catalog.videoAssignments === 'object' ? catalog.videoAssignments : {},
    updatedAt: catalog.updatedAt || null,
  }
}

function applyCatalog(catalog) {
  const normalized = normalizeCatalog(catalog)
  saveCourses(normalized.courses)
  localStorage.setItem(CF_VIDEOS_KEY, JSON.stringify(normalized.cfVideos))
  localStorage.setItem(VIDEO_ASSIGN_KEY, JSON.stringify(normalized.videoAssignments))
  window.dispatchEvent(new Event('course-catalog-updated'))
  return normalized
}

export function getLocalCourseCatalog() {
  return {
    courses: getCourses(),
    cfVideos: getCFVideos(),
    videoAssignments: getVideoAssignments(),
  }
}

async function readRemoteCourseCatalog() {
  const response = await fetch(`${WORKER_URL}/api/course-catalog`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    throw new Error(data.error || '讀取課程目錄失敗')
  }
  return normalizeCatalog(data.catalog)
}

export async function fetchCourseCatalog() {
  return applyCatalog(await readRemoteCourseCatalog())
}

export async function saveCourseCatalog(catalog = getLocalCourseCatalog()) {
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('缺少管理員登入狀態，無法同步課程')

  const response = await fetch(`${WORKER_URL}/api/admin/course-catalog`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(normalizeCatalog(catalog)),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    throw new Error(data.error || '同步課程目錄失敗')
  }
  return applyCatalog(data.catalog)
}

export async function seedCourseCatalogIfEmpty() {
  const local = getLocalCourseCatalog()
  const remote = await readRemoteCourseCatalog()
  if (remote.courses.length === 0 && local.courses.length > 0) {
    return saveCourseCatalog(local)
  }
  return applyCatalog(remote)
}
