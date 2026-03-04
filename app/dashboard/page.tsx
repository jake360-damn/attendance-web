'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import ExcelUploader from '@/components/excel/ExcelUploader'
import ExcelEditor from '@/components/excel/ExcelEditor'
import FileList from '@/components/files/FileList'
import FileViewer from '@/components/files/FileViewer'
import EditHistoryModal from '@/components/files/EditHistoryModal'
import { User, SharedFile } from '@/types'
import { 
  LogOut, 
  User as UserIcon, 
  FileSpreadsheet, 
  FolderOpen,
  Upload,
  Shield
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
  const router = useRouter()

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

  const [files, setFiles] = useState<SharedFile[]>([])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">考勤管理系统</h1>
              </div>
              
              <nav className="hidden md:flex items-center gap-1 ml-8">
                <button
                  onClick={() => setViewMode('files')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'files' || viewMode === 'viewer'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  文件列表
                </button>
                
                <button
                  onClick={() => setViewMode('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'upload' || viewMode === 'editor'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  上传文件
                </button>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  <Shield className="w-4 h-4" />
                  管理员
                </span>
              )}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">文件列表</h2>
              <button
                onClick={() => setViewMode('upload')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                上传新文件
              </button>
            </div>
            <FileList
              currentUser={user}
              onSelectFile={handleSelectFile}
              onViewHistory={handleViewHistory}
            />
          </div>
        )}

        {viewMode === 'upload' && !excelData && (
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
        )}

        {viewMode === 'editor' && excelData && (
          <ExcelEditor
            data={excelData}
            onBack={handleBackFromEditor}
            userId={userId}
          />
        )}

        {viewMode === 'viewer' && selectedFile && (
          <FileViewer
            file={selectedFile}
            currentUser={user}
            onBack={handleBackFromViewer}
            onViewHistory={() => handleViewHistory(selectedFile.id)}
          />
        )}
      </main>

      {historyFileId && (
        <EditHistoryModal
          fileId={historyFileId}
          fileName={historyFileName}
          onClose={handleCloseHistory}
        />
      )}
    </div>
  )
}
