// Separate AI-only products from the existing course memberships.
export const AI_ONLY_PLANS = ['ai_free', 'ai_trial', 'ai_subscription']

export function isAIOnly(user) {
  return Boolean(user && user.role !== 'admin' &&
    AI_ONLY_PLANS.includes(user.planId || user.plan_id || user.tier))
}

export function memberHome(user) {
  if (user?.role === 'admin') return '/admin'
  if (user?.tier === 'managed') return '/managed'
  return isAIOnly(user) ? '/dashboard/ai-tools' : '/dashboard'
}

export function canAccessStudentPath(user, pathname) {
  if (!isAIOnly(user)) return true
  return ['/dashboard/ai-tools', '/dashboard/profile'].some(path =>
    pathname === path || pathname.startsWith(`${path}/`))
}

export function hasActiveCourseMembership(membership, now = Date.now()) {
  if (!membership || membership.status !== 'active') return false
  if (!['trial', 'creator', 'master', 'managed'].includes(membership.plan_id)) return false
  return !membership.expires_at || new Date(membership.expires_at).getTime() > now
}

// Login destinations are explicit internal routes; never follow arbitrary URLs.
export function loginDestination(user, next) {
  if (user?.role === 'admin' || user?.tier === 'managed') return memberHome(user)
  if (next === '/dashboard/ai-tools') return next
  if (next === '/dashboard/courses' && !isAIOnly(user)) return next
  if (['/dashboard/profile?upgrade=creator', '/dashboard/profile?upgrade=master'].includes(next)) return next
  return memberHome(user)
}
