import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL  || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase    = url && key ? createClient(url, key) : null
export const hasSupabase = !!(url && key)
export const allowLocalFallback = import.meta.env.DEV
export const allowLocalBetaFallback = allowLocalFallback

export const BANNER_BUCKET = 'banners'
