'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Loading from '@/components/ui/Loading'
import { 
  X, 
  Clock, 
  User as UserIcon,
  FileSpreadsheet,
  Plus,
  Edit3,
  Trash2,
  Search,
  ArrowRight,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface EditHistoryItem {
  id: string
  file_id: string
  user_id: string | null
  action: string
  row_index: number | null
  col_index: number | null
  field_name: string | null
  old_value: string | null
  new_value: string | null
  description: string | null
  created_at: string
  user_name: string
  user_email: string
  file_name: string
}

interface GlobalHistoryModalProps {
  onClose: () => void
}

export default function GlobalHistoryModal({ onClose }: GlobalHistoryModalProps) {
  const [history, setHistory] = useState<EditHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [supabase, setSupabase] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  useEffect(() => {
    if (!supabase) return
    fetchHistory()
  }, [supabase, currentPage, actionFilter])

  const fetchHistory = async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('edit_history')
        .select(`
          id,
          file_id,
          user_id,
          action,
          row_index,
          col_index,
          field_name,
          old_value,
          new_value,
          description,
          created_at,
          profiles(full_name, email),
          excel_files(file_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      const { data, error, count } = await query

      if (error) throw error

      const formattedHistory = (data || []).map((item: any) => ({
        id: item.id,
        file_id: item.file_id,
        user_id: item.user_id,
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
        file_name: item.excel_files?.file_name || '未知文件',
      }))

      setHistory(formattedHistory)
      setTotalCount(count || 0)
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
      item.field_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          bgColor: 'bg-emerald-600/20',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-600/50'
        }
      case 'update':
        return {
          icon: <Edit3 className="w-4 h-4" />,
          label: '修改',
          bgColor: 'bg-yellow-600/20',
          textColor: 'text-yellow-400',
          borderColor: 'border-yellow-600/50'
        }
      case 'delete':
        return {
          icon: <Trash2 className="w-4 h-4" />,
          label: '删除',
          bgColor: 'bg-red-600/20',
          textColor: 'text-red-400',
          borderColor: 'border-red-600/50'
        }
      default:
        return {
          icon: <Edit3 className="w-4 h-4" />,
          label: action,
          bgColor: 'bg-gray-700',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-600'
        }
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-200">全局修改历史</h2>
              <p className="text-sm text-gray-400">管理员视图 - 查看所有文件的修改记录</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="搜索用户、文件、描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setCurrentPage(0)
                }}
                className="px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all w-32"
              >
                <option value="all">全部操作</option>
                <option value="create">新增</option>
                <option value="update">修改</option>
                <option value="delete">删除</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <Loading text="加载历史记录..." className="py-16" />
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-20 h-20 bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-lg font-medium text-gray-300 mb-1">
                {searchTerm ? '没有找到匹配的记录' : '暂无修改历史'}
              </p>
              <p className="text-gray-500">
                {searchTerm ? '尝试其他搜索条件' : '系统还没有任何修改记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item, index) => {
                const config = getActionConfig(item.action)
                return (
                  <div
                    key={item.id}
                    className={`bg-gray-800/60 backdrop-blur-md rounded-xl p-4 border-l-4 ${config.borderColor} animate-fade-in shadow-lg border border-gray-700/50`}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-9 h-9 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0 border ${config.borderColor}`}>
                          <span className={config.textColor}>{config.icon}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                              {config.label}
                            </span>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <FileSpreadsheet className="w-3 h-3" />
                              <span className="font-medium text-gray-300">{item.file_name}</span>
                            </span>
                            {item.field_name && (
                              <span className="text-sm text-gray-500">
                                字段: <span className="font-medium text-gray-300">{item.field_name}</span>
                              </span>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                          )}
                          
                          {(item.old_value !== null || item.new_value !== null) && (
                            <div className="flex items-center gap-2 text-sm bg-gray-900/50 rounded-lg px-3 py-2 flex-wrap">
                              {item.old_value !== null && (
                                <span className="text-red-400 line-through bg-red-600/10 px-2 py-0.5 rounded border border-red-600/30">
                                  "{item.old_value}"
                                </span>
                              )}
                              {item.old_value !== null && item.new_value !== null && (
                                <ArrowRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              )}
                              {item.new_value !== null && (
                                <span className="text-emerald-400 bg-emerald-600/10 px-2 py-0.5 rounded border border-emerald-600/30">
                                  "{item.new_value}"
                                </span>
                              )}
                            </div>
                          )}
                          
                          {(item.row_index !== null && item.row_index !== undefined || item.col_index !== null && item.col_index !== undefined) && (
                            <div className="text-xs text-gray-500 mt-2">
                              位置: 行 {item.row_index !== null && item.row_index !== undefined ? item.row_index + 1 : '-'}
                              {item.col_index !== null && item.col_index !== undefined && `, 列 ${item.col_index + 1}`}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-gray-300 mb-1">
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-700 rounded-full flex items-center justify-center">
                            <UserIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium">{item.user_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
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

        <div className="p-4 border-t border-gray-700 bg-gray-800/80 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                共 {totalCount} 条记录
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-300">
                    第 {currentPage + 1} / {totalPages} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
