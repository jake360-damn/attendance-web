'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import WaveInput from '@/components/ui/WaveInput'
import { Mail, Lock, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supabase, setSupabase] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setError(error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来</h1>
          <p className="text-gray-600">登录您的考勤管理账户</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-2">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5 z-10" />
            <div className="pl-8">
              <WaveInput
                type="email"
                label="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
              />
            </div>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5 z-10" />
            <div className="pl-8">
              <WaveInput
                type="password"
                label="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              isLoading={loading}
              className="w-full"
              size="lg"
            >
              登录
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            还没有账户？{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              立即注册
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
