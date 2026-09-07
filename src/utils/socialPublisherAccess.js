const SOCIAL_PUBLISHER_ALLOWED_EMAILS = ['allen@xgfx-tw.com']

export function canUseSocialPublisher(user) {
  const email = String(user?.email || '').trim().toLowerCase()
  return SOCIAL_PUBLISHER_ALLOWED_EMAILS.includes(email)
}
