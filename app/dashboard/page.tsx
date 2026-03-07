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
import { User, SharedFile } from '@/types'
import { 
  LogOut, 
  User as UserIcon, 
  FileSpreadsheet, 
  FolderOpen,
  Upload,
  Shield,
  Sparkles,
  ChevronRight,
  Clock
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
    
    // Try to initialize immediately
    if (initVanta()) return
    
    // Wait for libraries and ref to be ready
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
      
      <div className="relative z-10">
      <header className="sticky top-0 z-40 bg-gray-900/70 backdrop-blur-xl border-b border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-600/30">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800"></div>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    考勤管理系统
                  </h1>
                  <p className="text-xs text-gray-400">Attendance Management</p>
                </div>
              </div>
              
              <nav className="hidden md:flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('files')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'files' || viewMode === 'viewer'
                      ? 'bg-gray-700 text-yellow-400 shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  文件列表
                </button>
                
                <button
                  onClick={() => setViewMode('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'upload' || viewMode === 'editor'
                      ? 'bg-gray-700 text-yellow-400 shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  上传文件
                </button>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              {isAdmin && (
                <>
                  <button
                    onClick={() => setShowGlobalHistory(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">全局历史</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-full text-xs font-medium shadow-lg shadow-yellow-600/30">
                    <Shield className="w-3.5 h-3.5" />
                    管理员
                  </span>
                </>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/70 rounded-full">
                <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-200">{user?.full_name || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
