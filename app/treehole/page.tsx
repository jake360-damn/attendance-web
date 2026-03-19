'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { ArrowLeft, Send, User, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Danmaku {
  id: string
  content: string
  user_name: string
  created_at: string
  color: string
  top: number
  duration: number
}

const COLORS = [
  '#ffffff',
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dfe6e9',
  '#fd79a8',
  '#a29bfe',
  '#00b894',
]

const MAX_DISPLAY_COUNT = 10
const DANMAKU_LIFETIME = 10 * 60 * 1000

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function getRandomTop() {
  return Math.random() * 70 + 5
}

function isDanmakuExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return now - created > DANMAKU_LIFETIME
}

export default function TreeHolePage() {
  const [danmakus, setDanmakus] = useState<Danmaku[]>([])
  const [activeDanmakus, setActiveDanmakus] = useState<Danmaku[]>([])
  const [inputValue, setInputValue] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [videoLoading, setVideoLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const displayIndexRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    checkUser()
  }, [supabase])

  useEffect(() => {
    const fetchDanmakus = async () => {
      const { data, error } = await supabase
        .from('treehole_danmakus')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500)
      
      if (data && !error) {
        const validDanmakus = data
          .filter((d: any) => !isDanmakuExpired(d.created_at))
          .map((d: any) => ({
            ...d,
            color: getRandomColor(),
            top: getRandomTop(),
            duration: Math.random() * 3 + 5,
          }))
        setDanmakus(validDanmakus)
      }
    }
    fetchDanmakus()

    const channel = supabase
      .channel('treehole-danmakus')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'treehole_danmakus' },
        (payload: any) => {
          if (!isDanmakuExpired(payload.new.created_at)) {
            const newDanmaku: Danmaku = {
              ...payload.new,
              color: getRandomColor(),
              top: getRandomTop(),
              duration: Math.random() * 3 + 5,
            }
            setDanmakus(prev => [...prev, newDanmaku])
            setActiveDanmakus(prev => [...prev, newDanmaku])
          }
        }
      )
      .subscribe((status: any) => {
        console.log('Supabase channel status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    if (danmakus.length === 0) {
      setActiveDanmakus([])
      return
    }

    const displayNextBatch = () => {
      if (danmakus.length === 0) return

      const startIdx = displayIndexRef.current
      let count = 0
      let batch: Danmaku[] = []

      while (count < MAX_DISPLAY_COUNT && batch.length < MAX_DISPLAY_COUNT) {
        const idx = (startIdx + count) % danmakus.length
        const danmaku = {
          ...danmakus[idx],
          top: getRandomTop(),
          duration: Math.random() * 3 + 5,
        }
        batch.push(danmaku)
        count++
        
        if (idx === danmakus.length - 1) {
          break
        }
      }

      displayIndexRef.current = (startIdx + count) % danmakus.length
      setActiveDanmakus(batch)
    }

    displayNextBatch()
    intervalRef.current = setInterval(displayNextBatch, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [danmakus])

  useEffect(() => {
    const cleanup = setInterval(() => {
      setDanmakus(prev => prev.filter(d => !isDanmakuExpired(d.created_at)))
      setActiveDanmakus(prev => prev.filter(d => !isDanmakuExpired(d.created_at)))
    }, 60000)

    return () => clearInterval(cleanup)
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
    const timeout = setTimeout(() => {
      setVideoLoading(false)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('请先登录后再发送弹幕')
      router.push('/auth/login')
      return
    }

    if (!inputValue.trim()) return

    setSubmitting(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const { error } = await supabase
        .from('treehole_danmakus')
        .insert({
          user_id: user.id,
          user_name: profile?.full_name || user.email?.split('@')[0] || '匿名用户',
          content: inputValue.trim(),
        })

      if (error) throw error
      
      setInputValue('')
    } catch (error: any) {
      console.error('发送弹幕失败:', error)
      alert('发送失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {videoLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white/70">视频加载中...</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoading(false)}
        onCanPlay={() => setVideoLoading(false)}
        onError={() => setVideoLoading(false)}
        onLoadedMetadata={() => setVideoLoading(false)}
      >
        <source src="/video.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {activeDanmakus.map((danmaku, index) => (
          <div
            key={`${danmaku.id}-${index}`}
            className="absolute whitespace-nowrap text-lg font-medium drop-shadow-lg animate-danmaku"
            style={{
              top: `${danmaku.top}%`,
              color: danmaku.color,
              animationDuration: `${danmaku.duration}s`,
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {danmaku.content}
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-4 z-20">
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-20">
        {user ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white">
            <User className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>
        ) : (
          <Link 
            href="/auth/login"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
          >
            登录后发送弹幕
          </Link>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">树洞</h1>
            <p className="text-white/80 text-sm">在这里，你可以畅所欲言</p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={user ? "说点什么吧..." : "请先登录"}
              disabled={!user || submitting}
              maxLength={100}
              className="flex-1 px-5 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || submitting || !inputValue.trim()}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-medium hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </form>

          <div className="mt-3 text-center text-white/50 text-xs">
            已有 {danmakus.length} 条弹幕，{activeDanmakus.length} 条正在显示
          </div>
        </div>
      </div>
    </div>
  )
}
