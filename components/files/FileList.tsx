'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { SharedFile, User } from '@/types'
import DeleteConfirmModal from './DeleteConfirmModal'
import Loading from '@/components/ui/Loading'
import { 
  FileSpreadsheet, 
  Search, 
  Clock, 
  User as UserIcon,
  Share2,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  HardDrive,
  Table,
  Calendar,
  Lock
} from 'lucide-react'

interface FileListProps {
  currentUser: User | null
  onSelectFile: (file: SharedFile) => void
  onViewHistory: (fileId: string) => void
}

export default function FileList({ currentUser, onSelectFile, onViewHistory }: FileListProps) {
  const [files, setFiles] = useState<SharedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'fileName' | 'uploader'>('fileName')
  const [supabase, setSupabase] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    file: SharedFile | null
    isDeleting: boolean
  }>({
    isOpen: false,
    file: null,
    isDeleting: false
  })

  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  useEffect(() => {
    if (!supabase) return
    fetchFiles()
  }, [supabase])

  const fetchFiles = async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('excel_files')
        .select(`
          id,
          file_name,
          file_size,
          row_count,
          created_at,
          updated_at,
          is_shared,
          shared_by,
          profiles!excel_files_user_id_fkey(full_name, email),
          profiles_shared_by:profiles!excel_files_shared_by_fkey(full_name)
        `)
        .or(`user_id.eq.${currentUser?.id},is_shared.eq.true`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedFiles = (data || []).map((file: any) => ({
        id: file.id,
        file_name: file.file_name,
        file_size: file.file_size,
        row_count: file.row_count,
        created_at: file.created_at,
        updated_at: file.updated_at,
        is_shared: file.is_shared || false,
        shared_by: file.shared_by,
        uploader_name: file.profiles?.full_name || file.profiles?.email || '未知用户',
        uploader_email: file.profiles?.email || '',
        shared_by_name: file.profiles_shared_by?.full_name || null,
      }))

      setFiles(formattedFiles)
    } catch (error) {
      console.error('获取文件列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (file: SharedFile) => {
    setDeleteModal({
      isOpen: true,
      file,
      isDeleting: false
    })
  }

  const handleDeleteConfirm = async () => {
    if (!supabase || !deleteModal.file || !currentUser) return

    setDeleteModal(prev => ({ ...prev, isDeleting: true }))

    try {
      const fileId = deleteModal.file.id
      const fileName = deleteModal.file.file_name

      await supabase
        .from('edit_history')
        .insert({
          file_id: fileId,
          user_id: currentUser.id,
          action: 'delete',
          description: `删除了文件 "${fileName}"`,
        })

      const { error: rawDataError } = await supabase
        .from('excel_data_raw')
        .delete()
        .eq('file_id', fileId)

      if (rawDataError) {
        console.error('删除原始数据失败:', rawDataError)
      }

      const { error: recordsError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('file_id', fileId)

      if (recordsError) {
        console.error('删除考勤记录失败:', recordsError)
      }

      const { error: fileError } = await supabase
        .from('excel_files')
        .delete()
        .eq('id', fileId)

      if (fileError) throw fileError

      setFiles(prev => prev.filter(f => f.id !== fileId))
      setDeleteModal({ isOpen: false, file: null, isDeleting: false })
      alert('文件已删除')
    } catch (error: any) {
      console.error('删除文件失败:', error)
      alert('删除失败: ' + error.message)
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, file: null, isDeleting: false })
  }

  const canDelete = (file: SharedFile) => {
    if (isAdmin) return true
    const isOwner = file.uploader_email === currentUser?.email
    return isOwner && !file.is_shared
  }

  const filteredFiles = files.filter(file => {
    if (!searchTerm) return true
    
    if (searchType === 'fileName') {
      return file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    } else {
      return (file.uploader_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              file.uploader_email?.toLowerCase().includes(searchTerm.toLowerCase()))
    }
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-12">
        <Loading text="加载文件列表..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'fileName' | 'uploader')}
              className="bg-gray-700/50 border border-gray-600/50 text-white rounded-lg px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              <option value="fileName" className="bg-gray-800">按文件名</option>
              <option value="uploader" className="bg-gray-800">按上传者</option>
            </select>
          </div>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchType === 'fileName' ? '搜索文件名...' : '搜索上传者名称...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>
          
          <button
            onClick={fetchFiles}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            title="刷新列表"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
            <FileText className="w-4 h-4" />
            共 {filteredFiles.length} 个文件
          </div>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="p-16 text-center">
          <div className="inline-flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-700/50 rounded-2xl flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-lg font-medium text-white mb-1">
              {searchTerm ? '没有找到匹配的文件' : '暂无文件'}
            </p>
            <p className="text-gray-400">
              {searchTerm ? '尝试其他搜索条件' : '点击上方按钮上传您的第一个文件'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4">
          {filteredFiles.map((file, index) => (
            <div 
              key={file.id} 
              className="bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 rounded-xl p-5 transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20 flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{file.file_name}</h3>
                      {file.is_shared ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex-shrink-0">
                          <Share2 className="w-3 h-3" />
                          已共享
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-600/50 text-gray-400 rounded-full text-xs font-medium flex-shrink-0">
                          <Lock className="w-3 h-3" />
                          私有
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4" />
                        <span>{file.uploader_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatFileSize(file.file_size)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Table className="w-4 h-4" />
                        <span>{file.row_count} 行</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onSelectFile(file)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    查看
                  </button>
                  <button
                    onClick={() => onViewHistory(file.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    历史
                  </button>
                  {canDelete(file) && (
                    <button
                      onClick={() => handleDeleteClick(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        fileName={deleteModal.file?.file_name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  )
}
