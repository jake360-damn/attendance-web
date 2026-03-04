'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import ExcelUploader from '@/components/excel/ExcelUploader'
import ExcelEditor from '@/components/excel/ExcelEditor'
import { User } from '@/types'
import { LogOut, User as UserIcon, FileSpreadsheet } from 'lucide-react'

// 禁用静态生成，使用客户端渲染
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [excelData, setExcelData] = useState<any>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // 在客户端初始化 Supabase
    const client = createBrowserClient()
    setSupabase(client)
  }, [])

  useEffect(() => {
    if (!supabase) return
    
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth/login')
          return
        }

        // 保存用户ID（从session获取，确保有值）
        setUserId(session.user.id)

        // 获取用户资料
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUser(profile as User)
        } else {
          // 如果没有profile，使用session中的用户信息
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || '',
            role: 'user',
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User)
        }
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()
  }, [router, supabase])

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleExcelUpload = (data: any) => {
    setExcelData(data)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">考勤管理系统</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <UserIcon className="w-5 h-5" />
                <span>{user?.full_name || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!excelData ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                上传考勤文件
              </h2>
              <p className="text-gray-600">
                支持 .xlsx 和 .xls 格式的 Excel 文件
              </p>
            </div>
            <ExcelUploader onUpload={handleExcelUpload} />
          </div>
        ) : (
          <ExcelEditor
            data={excelData}
            onBack={() => setExcelData(null)}
            userId={userId}
          />
        )}
      </main>
    </div>
  )
}
