'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { SharedFile, User } from '@/types'
import { 
  FileSpreadsheet, 
  Search, 
  Clock, 
  User as UserIcon,
  Share2,
  Eye
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'fileName' | 'uploader')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="fileName">按文件名</option>
              <option value="uploader">按上传者</option>
            </select>
          </div>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchType === 'fileName' ? '搜索文件名...' : '搜索上传者名称...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            共 {filteredFiles.length} 个文件
          </div>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? '没有找到匹配的文件' : '暂无文件'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  上传者
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  行数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  上传时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">{file.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <UserIcon className="w-4 h-4" />
                      <span>{file.uploader_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatFileSize(file.file_size)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {file.row_count} 行
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(file.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {file.is_shared ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <Share2 className="w-3 h-3" />
                        已共享
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        私有
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectFile(file)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
                      <button
                        onClick={() => onViewHistory(file.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                        历史
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
