'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Mail, Lock, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [supabase, setSupabase] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  const confirmEmail = async (userEmail: string) => {
    setConfirming(true)
    try {
      const response = await fetch('/api/auth/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })
      const data = await response.json()
      
      if (response.ok) {
        // 邮箱确认成功，重新尝试登录
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password,
        })
        
        if (!loginError) {
          router.push('/dashboard')
          router.refresh()
          return
        }
      }
      setError(data.error || '邮箱确认失败，请联系管理员')
    } catch (err: any) {
      setError(err.message || '邮箱确认失败')
    } finally {
      setConfirming(false)
    }
  }

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
      const errorMessage = error.message || ''
      
      // 处理邮箱未确认的错误 - 自动确认邮箱
      if (errorMessage.includes('Email not confirmed') || errorMessage.includes('not confirmed')) {
        setError('检测到邮箱未验证，正在自动验证...')
        await confirmEmail(email)
        return
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('邮箱或密码错误')
      } else {
        setError(errorMessage || '登录失败')
      }
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
          <div className={`p-4 rounded-lg mb-6 text-sm ${
            error.includes('正在') ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
          }`}>
            {confirming ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在验证邮箱，请稍候...
              </span>
            ) : error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <Input
              type="email"
              label="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
              className="pl-10"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <Input
              type="password"
              label="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              className="pl-10"
            />
          </div>

          <Button
            type="submit"
            isLoading={loading || confirming}
            className="w-full"
            size="lg"
          >
            登录
          </Button>
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
