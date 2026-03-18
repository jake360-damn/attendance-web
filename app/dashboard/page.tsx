'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import ExcelUploader from '@/components/excel/ExcelUploader'
import ExcelEditor from '@/components/excel/ExcelEditor'
import FileList from '@/components/files/FileList'
import FileViewer from '@/components/files/FileViewer'
import EditHistoryModal from '@/components/files/EditHistoryModal'
import GlobalHistoryModal from '@/components/files/GlobalHistoryModal'
import Loading from '@/components/ui/Loading'
import StaggeredMenu, { MenuItem } from '@/components/ui/StaggeredMenu'
import { User, SharedFile } from '@/types'
import { 
  FolderOpen,
  Upload,
  Clock,
  Home,
  FileSpreadsheet
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type ViewMode = 'upload' | 'files' | 'editor' | 'viewer'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [excelData, setExcelData] = useState<any>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('files')
  const [selectedFile, setSelectedFile] = useState<SharedFile | null>(null)
  const [historyFileId, setHistoryFileId] = useState<string | null>(null)
  const [historyFileName, setHistoryFileName] = useState<string>('')
  const [showGlobalHistory, setShowGlobalHistory] = useState(false)
  const [files, setFiles] = useState<SharedFile[]>([])
  const router = useRouter()
  const vantaRef = useRef<HTMLDivElement>(null)
  const vantaEffectRef = useRef<any>(null)

  useEffect(() => {
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

        setUserId(session.user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUser(profile as User)
        } else {
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

  useEffect(() => {
    const initVanta = () => {
      const currentRef = vantaRef.current
      
      if (!currentRef) return false
      if (!window.VANTA || !window.THREE || !window.p5) return false
      
      if (vantaEffectRef.current) {
        vantaEffectRef.current.destroy()
      }
      
      try {
        vantaEffectRef.current = window.VANTA.TOPOLOGY({
          el: currentRef,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x89964e,
          backgroundColor: 0x222222
        })
        return true
      } catch (error) {
        console.error('Error initializing Vanta TOPOLOGY:', error)
        return false
      }
    }
    
    if (initVanta()) return
    
    const checkLoaded = setInterval(() => {
      const currentRef = vantaRef.current
      if (window.VANTA && window.THREE && window.p5 && currentRef) {
        if (initVanta()) {
          clearInterval(checkLoaded)
        }
      }
    }, 100)
    
    return () => {
      clearInterval(checkLoaded)
      if (vantaEffectRef.current) {
        vantaEffectRef.current.destroy()
        vantaEffectRef.current = null
      }
    }
  }, [])

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleExcelUpload = (data: any) => {
    setExcelData(data)
    setViewMode('editor')
  }

  const handleSelectFile = (file: SharedFile) => {
    setSelectedFile(file)
    setViewMode('viewer')
  }

  const handleViewHistory = (fileId: string) => {
    const file = selectedFile || files.find(f => f.id === fileId)
    setHistoryFileId(fileId)
    setHistoryFileName(file?.file_name || '')
  }

  const handleCloseHistory = () => {
    setHistoryFileId(null)
    setHistoryFileName('')
  }

  const handleBackFromEditor = () => {
    setExcelData(null)
    setViewMode('files')
  }

  const handleBackFromViewer = () => {
    setSelectedFile(null)
    setViewMode('files')
  }

  const isAdmin = user?.role === 'admin'

  const menuItems: MenuItem[] = [
    {
      label: '文件列表',
      link: '#files',
      ariaLabel: '查看文件列表',
      onClick: () => setViewMode('files')
    },
    {
      label: '上传文件',
      link: '#upload',
      ariaLabel: '上传新文件',
      onClick: () => setViewMode('upload')
    },
    {
      label: '树洞',
      link: '/treehole',
      ariaLabel: '进入树洞'
    },
    ...(isAdmin ? [{
      label: '全局历史',
      link: '#history',
      ariaLabel: '查看全局编辑历史',
      onClick: () => setShowGlobalHistory(true)
    }] : []),
    {
      label: '返回首页',
      link: '/',
      ariaLabel: '返回网站首页'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loading text="加载中..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <div 
        ref={vantaRef} 
        className="fixed inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />
      
      <StaggeredMenu
        position="right"
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        items={menuItems}
        displayItemNumbering={true}
        accentColor="#fbbf24"
        menuButtonColor="#e9e9ef"
        openMenuButtonColor="#111"
        changeMenuColorOnOpen={true}
        isFixed={true}
        closeOnClickAway={true}
        onLogout={handleLogout}
        userName={user?.full_name || user?.email}
        isAdmin={isAdmin}
      />

      <div className="relative z-10 pt-20">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {viewMode === 'files' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="bg-gray-800/60 backdrop-blur-md rounded-xl px-6 py-4 shadow-lg border border-gray-700/50">
                  <h2 className="text-2xl font-bold text-white">文件列表</h2>
                  <p className="text-gray-400 mt-1">管理您的考勤文件</p>
                </div>
                <button
                  onClick={() => setViewMode('upload')}
                  className="btn-stars"
                  type="button"
                >
                  <strong>上传新文件</strong>
                  <div id="container-stars">
                    <div id="stars"></div>
                  </div>
                  <div id="glow">
                    <div className="circle"></div>
                    <div className="circle"></div>
                  </div>
                </button>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50">
                <FileList
                  currentUser={user}
                  onSelectFile={handleSelectFile}
                  onViewHistory={handleViewHistory}
                />
              </div>
            </div>
          )}

          {viewMode === 'upload' && !excelData && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-gray-700/50">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-2xl shadow-xl shadow-yellow-600/30 mb-4">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    上传考勤文件
                  </h2>
                  <p className="text-gray-400">
                    支持 .xlsx 和 .xls 格式的 Excel 文件
                  </p>
                </div>
                <ExcelUploader onUpload={handleExcelUpload} />
              </div>
            </div>
          )}

          {viewMode === 'editor' && excelData && (
            <div className="bg-gray-800/60 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50">
              <ExcelEditor
                data={excelData}
                onBack={handleBackFromEditor}
                userId={userId}
              />
            </div>
          )}

          {viewMode === 'viewer' && selectedFile && (
            <div className="bg-gray-800/60 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50">
              <FileViewer
                file={selectedFile}
                currentUser={user}
                onBack={handleBackFromViewer}
                onViewHistory={() => handleViewHistory(selectedFile.id)}
              />
            </div>
          )}
        </main>

        {historyFileId && (
          <EditHistoryModal
            fileId={historyFileId}
            fileName={historyFileName}
            onClose={handleCloseHistory}
          />
        )}

        {showGlobalHistory && (
          <GlobalHistoryModal
            onClose={() => setShowGlobalHistory(false)}
          />
        )}
      </div>
    </div>
  )
}
