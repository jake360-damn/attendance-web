'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { SharedFile, User } from '@/types'
import * as XLSX from 'xlsx'
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Lock,
  Loader2,
  Clock,
  FileSpreadsheet,
  Search,
  Info
} from 'lucide-react'

interface FileViewerProps {
  file: SharedFile
  currentUser: User | null
  onBack: () => void
  onViewHistory: () => void
}

export default function FileViewer({ file, currentUser, onBack, onViewHistory }: FileViewerProps) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<any[][]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [supabase, setSupabase] = useState<any>(null)
  const [isShared, setIsShared] = useState(file.is_shared)
  const [rawDataId, setRawDataId] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = file.uploader_name === currentUser?.full_name || 
                  file.uploader_email === currentUser?.email

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  useEffect(() => {
    if (!supabase) return
    fetchFileData()
  }, [supabase])

  const fetchFileData = async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      // 首先尝试从 excel_data_raw 表获取原始格式数据
      const { data: rawData, error: rawError } = await supabase
        .from('excel_data_raw')
        .select('*')
        .eq('file_id', file.id)
        .single()

      if (rawData && !rawError) {
        // 使用原始格式数据
        setHeaders(rawData.headers || [])
        setRows(rawData.rows || [])
        setRawDataId(rawData.id)
      } else {
        // 如果没有原始数据，尝试从 attendance_records 获取（兼容旧数据）
        const { data: records, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('file_id', file.id)
          .order('created_at', { ascending: true })

        if (recordsError) throw recordsError

        if (records && records.length > 0) {
          const recordHeaders = ['姓名', '日期', '上班时间', '下班时间', '状态', '备注']
          const recordRows = records.map((record: any) => [
            record.employee_name || '',
            record.date || '',
            record.check_in || '',
            record.check_out || '',
            record.status || '',
            record.notes || '',
          ])
          setHeaders(recordHeaders)
          setRows(recordRows)
        } else {
          setHeaders([])
          setRows([])
        }
      }
    } catch (error) {
      console.error('获取文件数据失败:', error)
      setHeaders([])
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = rows.filter(row => 
    row.some(cell => 
      String(cell).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const startEdit = (rowIndex: number, colIndex: number, value: any) => {
    if (!isShared && !isOwner) return
    setEditingCell({ row: rowIndex, col: colIndex })
    setEditValue(String(value || ''))
  }

  const saveEdit = async () => {
    if (!editingCell || !supabase) return
    
    const { row, col } = editingCell
    const oldValue = rows[row][col]
    
    if (oldValue === editValue) {
      setEditingCell(null)
      setEditValue('')
      return
    }

    const newRows = [...rows]
    newRows[row][col] = editValue
    setRows(newRows)
    setEditingCell(null)
    setEditValue('')

    // 更新数据库中的原始数据
    if (rawDataId) {
      try {
        await supabase
          .from('excel_data_raw')
          .update({ rows: newRows })
          .eq('id', rawDataId)

        // 记录修改历史
        await supabase
          .from('edit_history')
          .insert({
            file_id: file.id,
            user_id: currentUser?.id,
            action: 'update',
            row_index: row,
            col_index: col,
            field_name: headers[col],
            old_value: String(oldValue || ''),
            new_value: String(editValue || ''),
            description: `修改了第 ${row + 1} 行的 "${headers[col]}" 字段`,
          })
      } catch (error) {
        console.error('更新数据失败:', error)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  const exportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, file.file_name)
  }

  const toggleShare = async () => {
    if (!supabase || !isAdmin) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('excel_files')
        .update({ 
          is_shared: !isShared,
          shared_by: !isShared ? currentUser?.id : null
        })
        .eq('id', file.id)

      if (error) throw error
      setIsShared(!isShared)
      alert(isShared ? '已取消共享' : '已共享文件')
    } catch (error) {
      console.error('更新共享状态失败:', error)
      alert('操作失败')
    } finally {
      setSaving(false)
    }
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
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">{file.file_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewHistory}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Clock className="w-4 h-4" />
              修改历史
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            {isAdmin && (
              <button
                onClick={toggleShare}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isShared 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isShared ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {isShared ? '取消共享' : '共享文件'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-500">
            共 {rows.length} 行数据
            {searchTerm && ` (显示 ${filteredRows.length} 行)`}
          </div>
          <div className="text-sm">
            {isShared ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                <Share2 className="w-3 h-3" />
                已共享
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                <Lock className="w-3 h-3" />
                私有
              </span>
            )}
          </div>
        </div>
      </div>

      {headers.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    序号
                  </th>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-4 py-3 text-sm text-gray-900"
                        onClick={() => startEdit(rowIndex, colIndex, cell)}
                      >
                        {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className={`cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded -mx-2 ${
                            (isShared || isOwner) ? '' : 'cursor-default hover:bg-transparent'
                          }`}>
                            {cell || '-'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? '没有找到匹配的数据' : '暂无数据'}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无数据</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">操作说明：</p>
        <div className="flex flex-wrap gap-4">
          <span>点击单元格 - 编辑内容</span>
          <span>Enter - 保存编辑</span>
          <span>Escape - 取消编辑</span>
          {isAdmin && <span className="text-blue-600">管理员可以控制文件共享状态</span>}
        </div>
      </div>
    </div>
  )
}
