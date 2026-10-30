// Separate AI-only products from the existing course memberships.
import { isOnlineMember } from './onlineMembership.js'
export const AI_ONLY_PLANS = ['ai_free', 'ai_trial', 'ai_subscription']

export function isAIOnly(user) {
  return Boolean(user && user.role !== 'admin' &&
    AI_ONLY_PLANS.includes(user.planId || user.plan_id || user.tier))
}

export function needsAIReview(user, now = Date.now()) {
  return user?.role !== 'admin' && isAIOnly(user) && Boolean(
    (user.accessStatus && user.accessStatus !== 'active') ||
    (user.expiresAt && new Date(user.expiresAt).getTime() <= now))
}

export function isCourseMembershipExpired(user, now = Date.now()) {
  return Boolean(user && user.role !== 'admin' && !isAIOnly(user) && !isOnlineMember(user) &&
    user.expiresAt && new Date(user.expiresAt).getTime() <= now)
}

export function memberHome(user) {
  if (user?.role === 'admin') return '/admin'
  if (user?.tier === 'managed') return '/managed'
  if (needsAIReview(user)) return '/ai-access'
  if (isCourseMembershipExpired(user)) return '/dashboard/profile'
  return isAIOnly(user) ? '/dashboard/ai-tools' : '/dashboard'
}

export function canAccessStudentPath(user, pathname) {
  if (needsAIReview(user)) return false
  if (isCourseMembershipExpired(user)) return pathname === '/dashboard/profile'
  if (isOnlineMember(user)) return !pathname.startsWith('/dashboard/booking') && !pathname.startsWith('/dashboard/publisher')
  if (!isAIOnly(user)) return true
  return ['/dashboard/ai-tools', '/dashboard/profile'].some(path =>
    pathname === path || pathname.startsWith(`${path}/`))
}

export function hasActiveCourseMembership(membership, now = Date.now()) {
  if (!membership || membership.status !== 'active') return false
  if (isOnlineMember(membership)) return true
  if (!['trial', 'creator', 'master', 'managed'].includes(membership.plan_id)) return false
  return !membership.expires_at || new Date(membership.expires_at).getTime() > now
}

// Login destinations are explicit internal routes; never follow arbitrary URLs.
export function loginDestination(user, next) {
  if (user?.role === 'admin' || user?.tier === 'managed') return memberHome(user)
  if (isSigningPath(next)) return next
  if (needsAIReview(user)) return '/ai-access'
  if (next === '/dashboard/ai-tools') return next
  if (next === '/dashboard/courses' && !isAIOnly(user)) return next
  if (['/dashboard/profile?upgrade=online', '/dashboard/profile?upgrade=creator', '/dashboard/profile?upgrade=master'].includes(next)) return next
  return memberHome(user)
}

export function isSigningPath(path) {
  if (!String(path || '').startsWith('/dashboard/profile?')) return false
  const url = new URL(path, 'https://toplevel-tw.com')
  return ['online', 'creator', 'master'].includes(url.searchParams.get('sign')) &&
    /^[0-9a-f-]{36}$/i.test(url.searchParams.get('student') || '') &&
    [...url.searchParams.keys()].every(key => ['sign', 'student'].includes(key))
}

export function signingPath(planId, userId) {
  return `/dashboard/profile?${new URLSearchParams({ sign: planId, student: userId })}`
}
