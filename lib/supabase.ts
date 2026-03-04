import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

// 获取环境变量
const getEnvVars = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  return { supabaseUrl, supabaseAnonKey }
}

// 检查是否在构建时（静态生成）
const isBuildTime = () => {
  return typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build'
}

// 服务端客户端 - 延迟初始化
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export const getSupabaseClient = () => {
  // 在构建时返回一个 mock 客户端，避免错误
  if (isBuildTime()) {
    const { supabaseUrl, supabaseAnonKey } = getEnvVars()
    if (!supabaseUrl || !supabaseAnonKey) {
      // 返回一个空的 mock 对象，避免构建错误
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          signInWithPassword: async () => ({ error: new Error('Not available during build') }),
          signUp: async () => ({ error: new Error('Not available during build') }),
          signOut: async () => ({ error: null }),
          exchangeCodeForSession: async () => ({ error: new Error('Not available during build') }),
        },
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
          insert: async () => ({ error: new Error('Not available during build') }),
        }),
      } as any
    }
    return createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  
  if (typeof window === 'undefined') {
    // 服务端：每次请求都创建新实例
    const { supabaseUrl, supabaseAnonKey } = getEnvVars()
    return createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  
  // 客户端：使用单例
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = getEnvVars()
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}

// 为了兼容性保留旧的导出（仅在客户端使用）
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null as any

// 客户端组件使用的客户端 - 包装函数以处理构建时
export const createBrowserClient = () => {
  // 在构建时返回 mock 客户端
  if (isBuildTime()) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ error: new Error('Not available during build') }),
        signUp: async () => ({ error: new Error('Not available during build') }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: async () => ({ error: new Error('Not available during build') }),
      }),
    } as any
  }
  return createClientComponentClient<Database>()
}
