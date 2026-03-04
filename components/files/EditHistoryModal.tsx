'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { EditHistory } from '@/types'
import { 
  X, 
  Clock, 
  User as UserIcon,
  FileSpreadsheet,
  Plus,
  Edit3,
  Trash2,
  Search
} from 'lucide-react'

interface EditHistoryModalProps {
  fileId: string | null
  fileName?: string
  onClose: () => void
}

export default function EditHistoryModal({ fileId, fileName, onClose }: EditHistoryModalProps) {
  const [history, setHistory] = useState<EditHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  useEffect(() => {
    if (!supabase || !fileId) return
    fetchHistory()
  }, [supabase, fileId])

  const fetchHistory = async () => {
    if (!supabase || !fileId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('edit_history')
        .select(`
          id,
          file_id,
          user_id,
          record_id,
          action,
          row_index,
          col_index,
          field_name,
          old_value,
          new_value,
          description,
          created_at,
          profiles(full_name, email)
        `)
        .eq('file_id', fileId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      const formattedHistory = (data || []).map((item: any) => ({
        id: item.id,
        file_id: item.file_id,
        user_id: item.user_id,
        record_id: item.record_id,
        action: item.action,
        row_index: item.row_index,
        col_index: item.col_index,
        field_name: item.field_name,
        old_value: item.old_value,
        new_value: item.new_value,
        description: item.description,
        created_at: item.created_at,
        user_name: item.profiles?.full_name || item.profiles?.email || '未知用户',
        user_email: item.profiles?.email || '',
      }))

      setHistory(formattedHistory)
    } catch (error) {
      console.error('获取修改历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter(item => {
    if (!searchTerm) return true
    return (
      item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.field_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'update':
        return <Edit3 className="w-4 h-4 text-blue-600" />
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-600" />
      default:
        return <Edit3 className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="text-green-600">新增</span>
      case 'update':
        return <span className="text-blue-600">修改</span>
      case 'delete':
        return <span className="text-red-600">删除</span>
      default:
        return <span>{action}</span>
    }
  }

  if (!fileId) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">修改历史记录</h2>
            {fileName && (
              <span className="text-gray-500 text-sm">- {fileName}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名、描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? '没有找到匹配的记录' : '暂无修改历史'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getActionIcon(item.action)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getActionLabel(item.action)}
                          {item.field_name && (
                            <span className="text-gray-600">
                              字段: <span className="font-medium">{item.field_name}</span>
                            </span>
                          )}
                        </div>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        )}
                        
                        {(item.old_value !== null || item.new_value !== null) && (
                          <div className="flex items-center gap-2 text-sm">
                            {item.old_value !== null && (
                              <span className="text-red-600 line-through">
                                "{item.old_value}"
                              </span>
                            )}
                            {item.old_value !== null && item.new_value !== null && (
                              <span className="text-gray-400">→</span>
                            )}
                            {item.new_value !== null && (
                              <span className="text-green-600">
                                "{item.new_value}"
                              </span>
                            )}
                          </div>
                        )}
                        
                        {(item.row_index !== null && item.row_index !== undefined || item.col_index !== null && item.col_index !== undefined) && (
                          <div className="text-xs text-gray-500">
                            位置: 行 {item.row_index !== null && item.row_index !== undefined ? item.row_index + 1 : '-'}
                            {item.col_index !== null && item.col_index !== undefined && `, 列 ${item.col_index + 1}`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-gray-500 space-y-1">
                      <div className="flex items-center gap-1 justify-end">
                        <UserIcon className="w-3 h-3" />
                        <span>{item.user_name}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {filteredHistory.length} 条记录</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
