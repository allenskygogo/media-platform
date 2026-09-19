// Playback freedom does not grant access to additional course products.
export function hasFreeCoursePlayback(user) {
  const membership = user?.planId || user?.plan_id || user?.tier
  return user?.role === 'admin' || ['creator', 'master', 'standard', 'advanced', 'managed'].includes(membership)
}

export function shouldForceFirstWatch(allowFreePlayback, progress) {
  return !allowFreePlayback && !progress?.completed
}
