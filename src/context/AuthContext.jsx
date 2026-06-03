import { createContext, useContext, useState, useEffect } from 'react'
import {
  initMockData, getUsers, saveUsers, addDays, TIER_META,
  checkAndSendTrialReminders, checkAndSendExpiryReminders,
} from '../data/mockData'
import { supabase, hasSupabase, allowLocalFallback } from '../lib/supabase'

const AuthContext = createContext(null)

const PLAN_TO_TIER = {
  trial: 'basic',
  creator: 'standard',
  master: 'advanced',
  managed: 'managed',
}

const LEGACY_TO_TIER = {
  basic: 'basic',
  standard: 'standard',
  advanced: 'advanced',
  managed: 'managed',
}

const toDateString = (value) => {
  if (!value) return null
  return String(value).split('T')[0]
}

const buildUserFromSupabase = (profile, membership) => {
  const planId = membership?.plan_id || null
  const legacyTier = membership?.legacy_tier || null
  const tier = PLAN_TO_TIER[planId] || LEGACY_TO_TIER[legacyTier] || null
  const name = profile.display_name || profile.email?.split('@')[0] || '學員'

  return {
    id: profile.id,
    name,
    email: profile.email,
    role: profile.role,
    tier,
    avatar: name.charAt(0),
    createdAt: toDateString(profile.created_at) || '',
    status: profile.status,
    expiresAt: toDateString(membership?.expires_at),
    trialCompletedAt: toDateString(membership?.trial_completed_at),
    courseCompletedAt: null,
    source: 'supabase',
    planId,
    legacyTier,
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initMockData()
    checkAndSendTrialReminders()
    checkAndSendExpiryReminders()

    let mounted = true

    const load = async () => {
      if (hasSupabase && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const user = await fetchSupabaseUser(session.user.id)
            if (mounted) persist(user)
          } else if (mounted) {
            setCurrentUser(null)
            localStorage.removeItem('mp_current_user')
          }
        } catch (err) {
          console.error('Supabase auth bootstrap failed:', err)
          if (mounted) setCurrentUser(null)
        } finally {
          if (mounted) setLoading(false)
        }
        return
      }

      if (allowLocalFallback) {
        const stored = localStorage.getItem('mp_current_user')
        if (stored && mounted) setCurrentUser(JSON.parse(stored))
      } else {
        localStorage.removeItem('mp_current_user')
      }
      if (mounted) setLoading(false)
    }

    load()

    return () => { mounted = false }
  }, [])

  const persist = (user) => {
    const { password: _, ...safe } = user
    setCurrentUser(safe)
    localStorage.setItem('mp_current_user', JSON.stringify(safe))
    return safe
  }

  const fetchSupabaseUser = async (userId) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, email, role, status, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) throw new Error('找不到會員資料，請聯絡管理員')
    if (profile.status === 'inactive') throw new Error('帳號已停用，請聯絡管理員')

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('plan_id, legacy_tier, status, starts_at, expires_at, trial_completed_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membershipError) throw membershipError
    if (profile.role === 'student' && !membership) throw new Error('會員尚未開通，請聯絡管理員')
    if (membership?.expires_at && new Date(membership.expires_at).getTime() < Date.now()) {
      throw new Error('會員效期已到期，請聯絡管理員續約')
    }
    return buildUserFromSupabase(profile, membership)
  }

  const login = async (email, password) => {
    if (hasSupabase && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('帳號或密碼錯誤')
      const user = await fetchSupabaseUser(data.user.id)
      return persist(user)
    }

    if (!allowLocalFallback) {
      throw new Error('登入服務尚未設定，請聯絡管理員')
    }

    const users = getUsers()
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) throw new Error('帳號或密碼錯誤')
    if (user.status === 'inactive') throw new Error('帳號已停用，請聯絡管理員')
    return persist(user)
  }

  const logout = async () => {
    if (hasSupabase && supabase) {
      await supabase.auth.signOut()
    }
    setCurrentUser(null)
    localStorage.removeItem('mp_current_user')
  }

  const register = (name, email, password, tier = 'basic') => {
    const users = getUsers()
    if (users.find(u => u.email === email)) throw new Error('此電子郵件已被使用')
    const today = new Date().toISOString().split('T')[0]
    const newUser = {
      id: Date.now(), name, email, password,
      role: 'student', tier,
      avatar: name.charAt(0),
      createdAt: today,
      status: 'active',
      // basic tier: expiresAt starts as null — only set after completing the trial session
      expiresAt: (tier === 'basic') ? null : (TIER_META[tier]?.days ? addDays(today, TIER_META[tier].days) : null),
    }
    saveUsers([...users, newUser])
    return persist(newUser)
  }

  const updateCurrentUser = (updates) => {
    if (hasSupabase && supabase && currentUser?.source === 'supabase') {
      const nextName = updates.name || currentUser.name
      const nextUser = { ...currentUser, ...updates, name: nextName }
      setCurrentUser(nextUser)
      localStorage.setItem('mp_current_user', JSON.stringify(nextUser))
      supabase
        .from('profiles')
        .update({ display_name: nextName })
        .eq('id', currentUser.id)
        .then(({ error }) => {
          if (error) console.error('Profile update failed:', error)
        })
      return
    }

    const users = getUsers()
    const idx = users.findIndex(u => u.id === currentUser.id)
    if (idx === -1) return
    users[idx] = { ...users[idx], ...updates }
    saveUsers(users)
    persist(users[idx])
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register, updateCurrentUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
