import { createContext, useContext, useState, useEffect } from 'react'
import {
  initMockData, getUsers, saveUsers, addDays, TIER_META,
  checkAndSendTrialReminders, checkAndSendExpiryReminders,
} from '../data/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initMockData()
    checkAndSendTrialReminders()
    checkAndSendExpiryReminders()
    const stored = localStorage.getItem('mp_current_user')
    if (stored) setCurrentUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const persist = (user) => {
    const { password: _, ...safe } = user
    setCurrentUser(safe)
    localStorage.setItem('mp_current_user', JSON.stringify(safe))
    return safe
  }

  const login = (email, password) => {
    const users = getUsers()
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) throw new Error('帳號或密碼錯誤')
    if (user.status === 'inactive') throw new Error('帳號已停用，請聯絡管理員')
    return persist(user)
  }

  const logout = () => {
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
