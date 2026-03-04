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
  Search,
  ArrowRight
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

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'create':
        return {
          icon: <Plus className="w-4 h-4" />,
          label: '新增',
          bgColor: 'bg-emerald-100',
          textColor: 'text-emerald-600',
          borderColor: 'border-emerald-200'
        }
      case 'update':
        return {
          icon: <Edit3 className="w-4 h-4" />,
          label: '修改',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        }
      case 'delete':
        return {
          icon: <Trash2 className="w-4 h-4" />,
          label: '删除',
          bgColor: 'bg-red-100',
          textColor: 'text-red-600',
          borderColor: 'border-red-200'
        }
      default:
        return {
          icon: <Edit3 className="w-4 h-4" />,
          label: action,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        }
    }
  }

  if (!fileId) return null

  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">修改历史记录</h2>
              {fileName && (
                <p className="text-sm text-gray-500">{fileName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名、描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-icon"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
              <p className="text-gray-500 mt-4">加载历史记录...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {searchTerm ? '没有找到匹配的记录' : '暂无修改历史'}
              </p>
              <p className="text-gray-500">
                {searchTerm ? '尝试其他搜索条件' : '该文件还没有任何修改记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item, index) => {
                const config = getActionConfig(item.action)
                return (
                  <div
                    key={item.id}
                    className={`card p-4 border-l-4 ${config.borderColor} animate-fade-in`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-9 h-9 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <span className={config.textColor}>{config.icon}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge ${config.bgColor} ${config.textColor}`}>
                              {config.label}
                            </span>
                            {item.field_name && (
                              <span className="text-sm text-gray-500">
                                字段: <span className="font-medium text-gray-700">{item.field_name}</span>
                              </span>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                          )}
                          
                          {(item.old_value !== null || item.new_value !== null) && (
                            <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                              {item.old_value !== null && (
                                <span className="text-red-600 line-through bg-red-50 px-2 py-0.5 rounded">
                                  "{item.old_value}"
                                </span>
                              )}
                              {item.old_value !== null && item.new_value !== null && (
                                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                              {item.new_value !== null && (
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                  "{item.new_value}"
                                </span>
                              )}
                            </div>
                          )}
                          
                          {(item.row_index !== null && item.row_index !== undefined || item.col_index !== null && item.col_index !== undefined) && (
                            <div className="text-xs text-gray-400 mt-2">
                              位置: 行 {item.row_index !== null && item.row_index !== undefined ? item.row_index + 1 : '-'}
                              {item.col_index !== null && item.col_index !== undefined && `, 列 ${item.col_index + 1}`}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium">{item.user_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {filteredHistory.length} 条记录
            </span>
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
