import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'
import {
  getSocialPublishAccounts,
  getSocialPublishJobs,
  saveSocialPublishAccounts,
  saveSocialPublishJobs,
} from '../data/mockData'

function nowText() {
  return new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeAccount(row) {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    status: row.status,
    accountName: row.external_account_name || '',
    updatedAt: formatDate(row.updated_at),
  }
}

function normalizeJob(row) {
  const video = row.social_videos || null
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.display_name || row.profiles?.email || '',
    title: row.title,
    caption: row.caption,
    videoName: video?.filename || '',
    videoSize: video?.size_bytes || 0,
    targets: (row.social_publish_targets || []).map(target => ({
      platform: target.platform,
      status: target.status,
      note: target.error_message || '',
    })),
    createdAt: formatDate(row.created_at),
  }
}

function assertConfigured() {
  if (!hasSupabase || !supabase) {
    if (allowLocalFallback) return false
    throw new Error('Social publisher storage is not configured')
  }
  return true
}

function isSchemaMissing(error) {
  const message = `${error?.code || ''} ${error?.message || ''}`
  return message.includes('42P01')
    || message.includes('PGRST200')
    || message.includes('PGRST205')
    || message.includes('Could not find the table')
    || message.includes('schema cache')
}

function localState() {
  return {
    accounts: getSocialPublishAccounts(),
    jobs: getSocialPublishJobs(),
    mode: 'local',
  }
}

export async function getSocialPublisherState(userId) {
  if (!assertConfigured()) {
    return localState()
  }

  const [{ data: accounts, error: accountsError }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase
      .from('social_accounts')
      .select('id, user_id, platform, status, external_account_name, updated_at')
      .eq('user_id', userId),
    supabase
      .from('social_publish_jobs')
      .select(`
        id,
        user_id,
        title,
        caption,
        created_at,
        social_videos(filename, size_bytes),
        social_publish_targets(platform, status, error_message)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  if (isSchemaMissing(accountsError) || isSchemaMissing(jobsError)) return localState()
  if (accountsError) throw accountsError
  if (jobsError) throw jobsError

  return {
    accounts: (accounts || []).map(normalizeAccount),
    jobs: (jobs || []).map(normalizeJob),
    mode: 'supabase',
  }
}

export async function toggleSocialAccount(user, platform) {
  const userId = user?.id
  if (!userId) throw new Error('請先登入')

  if (!assertConfigured()) {
    const accounts = getSocialPublishAccounts()
    const existing = accounts.find(account => String(account.userId) === String(userId) && account.platform === platform)
    const next = existing
      ? accounts.map(account => account.id === existing.id
        ? { ...account, status: account.status === 'connected' ? 'pending_oauth' : 'connected', updatedAt: nowText() }
        : account)
      : [...accounts, { id: Date.now(), userId, platform, status: 'connected', accountName: user?.name || '', updatedAt: nowText() }]
    saveSocialPublishAccounts(next)
    return next
  }

  const { data: current, error: findError } = await supabase
    .from('social_accounts')
    .select('id, status')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()

  if (isSchemaMissing(findError)) {
    const accounts = getSocialPublishAccounts()
    const existing = accounts.find(account => String(account.userId) === String(userId) && account.platform === platform)
    const next = existing
      ? accounts.map(account => account.id === existing.id
        ? { ...account, status: account.status === 'connected' ? 'pending_oauth' : 'connected', updatedAt: nowText() }
        : account)
      : [...accounts, { id: Date.now(), userId, platform, status: 'connected', accountName: user?.name || '', updatedAt: nowText() }]
    saveSocialPublishAccounts(next)
    return next
  }
  if (findError) throw findError

  const nextStatus = current?.status === 'connected' ? 'pending_oauth' : 'connected'
  const payload = {
    user_id: userId,
    platform,
    status: nextStatus,
    external_account_name: user?.name || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('social_accounts')
    .upsert(payload, { onConflict: 'user_id,platform' })

  if (error) throw error
  return null
}

export async function createSocialPublishJob(user, form, isConnected) {
  const userId = user?.id
  if (!userId) throw new Error('請先登入')

  const cleanTitle = form.title.trim()
  const cleanCaption = form.caption.trim()
  if (!cleanTitle || !cleanCaption || !form.videoName || form.platforms.length === 0) {
    throw new Error('請填寫標題、貼文內容、影片，並至少選擇一個平台')
  }

  const targets = form.platforms.map(platform => ({
    platform,
    status: isConnected(platform) ? 'ready' : 'waiting_connection',
    note: isConnected(platform) ? '等待正式發布 API 串接' : '尚未完成平台帳號串接',
  }))

  if (!assertConfigured()) {
    const jobs = getSocialPublishJobs()
    const job = {
      id: Date.now(),
      userId,
      userName: user?.name || '',
      title: cleanTitle,
      caption: cleanCaption,
      videoName: form.videoName,
      videoSize: form.videoSize,
      targets,
      createdAt: nowText(),
    }
    const next = [...jobs, job]
    saveSocialPublishJobs(next)
    return job
  }

  const { data: video, error: videoError } = await supabase
    .from('social_videos')
    .insert({
      user_id: userId,
      filename: form.videoName,
      mime_type: form.videoType || null,
      size_bytes: form.videoSize || 0,
      title: cleanTitle,
      caption: cleanCaption,
    })
    .select('id')
    .single()

  if (isSchemaMissing(videoError)) {
    const jobs = getSocialPublishJobs()
    const job = {
      id: Date.now(),
      userId,
      userName: user?.name || '',
      title: cleanTitle,
      caption: cleanCaption,
      videoName: form.videoName,
      videoSize: form.videoSize,
      targets,
      createdAt: nowText(),
    }
    const next = [...jobs, job]
    saveSocialPublishJobs(next)
    return job
  }
  if (videoError) throw videoError

  const { data: job, error: jobError } = await supabase
    .from('social_publish_jobs')
    .insert({
      user_id: userId,
      video_id: video.id,
      title: cleanTitle,
      caption: cleanCaption,
      status: 'pending',
    })
    .select('id')
    .single()

  if (jobError) throw jobError

  const { data: accounts, error: accountsError } = await supabase
    .from('social_accounts')
    .select('id, platform, status')
    .eq('user_id', userId)
    .in('platform', form.platforms)

  if (accountsError) throw accountsError
  const accountMap = new Map((accounts || []).map(account => [account.platform, account]))

  const { error: targetsError } = await supabase
    .from('social_publish_targets')
    .insert(targets.map(target => ({
      job_id: job.id,
      user_id: userId,
      platform: target.platform,
      social_account_id: accountMap.get(target.platform)?.id || null,
      status: target.status,
      error_message: target.note || null,
    })))

  if (targetsError) throw targetsError
  return job
}
