'use client'

import { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { createBrowserClient } from '@/lib/supabase'
import { 
  Save, 
  Download, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  FileSpreadsheet,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'

interface ExcelEditorProps {
  data: {
    headers: string[]
    rows: any[][]
    fileName: string
    fileSize: number
  }
  onBack: () => void
  userId: string
}

const STANDARD_HEADERS = ['姓名', '日期', '上班时间', '下班时间', '状态', '备注']

const HEADER_MAPPINGS: Record<string, string[]> = {
  '姓名': ['name', '姓名', '员工姓名', '员工', '名字', '职员姓名', 'name', 'employee_name'],
  '日期': ['date', '日期', '考勤日期', '打卡日期', '时间', 'date', 'attendance_date'],
  '上班时间': ['check_in', '上班时间', '上班', '签到时间', '打卡时间', '上班打卡', 'check_in', 'in_time'],
  '下班时间': ['check_out', '下班时间', '下班', '签退时间', '下班打卡', 'check_out', 'out_time'],
  '状态': ['status', '状态', '考勤状态', '出勤状态', 'attendance_status'],
  '备注': ['notes', '备注', '说明', 'remark', 'note', 'comments']
}

function matchHeaderToStandard(header: string): { standard: string | null, confidence: number } {
  const headerLower = header.toLowerCase().replace(/\s+/g, '_')
  
  for (const [standard, patterns] of Object.entries(HEADER_MAPPINGS)) {
    if (patterns.some(p => headerLower.includes(p.toLowerCase()) || p.toLowerCase().includes(headerLower))) {
      return { standard, confidence: 1 }
    }
  }
  
  return { standard: null, confidence: 0 }
}

function generateColumnMapping(headers: string[]): { 
  mapping: Map<string, string>, 
  unmatched: string[], 
  suggestions: Map<string, string[]> 
} {
  const mapping = new Map<string, string>()
  const unmatched: string[] = []
  const suggestions = new Map<string, string[]>()

  headers.forEach(header => {
    const result = matchHeaderToStandard(header)
    if (result.standard) {
      mapping.set(header, result.standard)
    } else {
      unmatched.push(header)
      suggestions.set(header, STANDARD_HEADERS.filter(h => !Array.from(mapping.values()).includes(h)))
    }
  })

  return { mapping, unmatched, suggestions }
}

export default function ExcelEditor({ data, onBack, userId }: ExcelEditorProps) {
  const [headers, setHeaders] = useState<string[]>(data.headers)
  const [originalHeaders, setOriginalHeaders] = useState<string[]>(data.headers)
  const [rows, setRows] = useState<any[][]>(data.rows)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [fileName, setFileName] = useState(data.fileName)
  const [supabase, setSupabase] = useState<any>(null)
  const [savedFileId, setSavedFileId] = useState<string | null>(null)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [columnMapping, setColumnMapping] = useState<Map<string, string>>(new Map())
  const [unmatchedHeaders, setUnmatchedHeaders] = useState<string[]>([])
  const [headerSuggestions, setHeaderSuggestions] = useState<Map<string, string[]>>(new Map())
  const [useOriginalHeaders, setUseOriginalHeaders] = useState(true)

  useEffect(() => {
    setSupabase(createBrowserClient())
    
    const { mapping, unmatched, suggestions } = generateColumnMapping(data.headers)
    setColumnMapping(mapping)
    setUnmatchedHeaders(unmatched)
    setHeaderSuggestions(suggestions)
    
    if (unmatched.length > 0) {
      setShowMappingModal(true)
    }
  }, [])

  const filteredRows = rows.filter(row => 
    row.some(cell => 
      String(cell).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const startEdit = (rowIndex: number, colIndex: number, value: any) => {
    setEditingCell({ row: rowIndex, col: colIndex })
    setEditValue(String(value || ''))
  }

  const saveEdit = () => {
    if (!editingCell) return
    
    const newRows = [...rows]
    newRows[editingCell.row][editingCell.col] = editValue
    setRows(newRows)
    setEditingCell(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const addRow = () => {
    const newRow = new Array(headers.length).fill('')
    setRows([...rows, newRow])
  }

  const deleteSelectedRows = () => {
    const newRows = rows.filter((_, index) => !selectedRows.has(index))
    setRows(newRows)
    setSelectedRows(new Set())
  }

  const toggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    setSelectedRows(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredRows.map((_, index) => index)))
    }
  }

  const handleHeaderMappingChange = (originalHeader: string, newMapping: string) => {
    const newMappingMap = new Map(columnMapping)
    newMappingMap.set(originalHeader, newMapping)
    setColumnMapping(newMappingMap)
    
    const newUnmatched = unmatchedHeaders.filter(h => h !== originalHeader)
    setUnmatchedHeaders(newUnmatched)
  }

  const applyHeaderMapping = () => {
    if (useOriginalHeaders) {
      setShowMappingModal(false)
      return
    }

    const newHeaders = headers.map(h => columnMapping.get(h) || h)
    setHeaders(newHeaders)
    setShowMappingModal(false)
  }

  const keepOriginalHeaders = () => {
    setUseOriginalHeaders(true)
    setHeaders(originalHeaders)
    setShowMappingModal(false)
  }

  const saveToDatabase = async () => {
    if (!supabase) {
      alert('Supabase 客户端未初始化')
      return
    }
    
    if (!userId) {
      alert('用户未登录，请先登录')
      return
    }
    
    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error('获取用户信息失败，请重新登录')
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: userData.user.email || '',
          full_name: userData.user.user_metadata?.full_name || '',
        } as any, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      if (profileError) {
        console.error('创建用户资料失败:', profileError)
        throw new Error('创建用户资料失败，无法保存文件: ' + profileError.message)
      }

      const { data: fileData, error: fileError } = await supabase
        .from('excel_files')
        .insert({
          user_id: userId,
          file_name: fileName,
          file_size: data.fileSize,
          row_count: rows.length,
          original_headers: originalHeaders,
        } as any)
        .select()
        .single()

      if (fileError) {
        console.error('文件保存错误:', fileError)
        throw new Error('文件保存失败: ' + fileError.message)
      }

      if (!fileData || !(fileData as any).id) {
        throw new Error('文件保存失败，未返回文件ID')
      }

      const fileId = (fileData as any).id
      setSavedFileId(fileId)

      const attendanceRecords = rows.map(row => {
        const record: any = {
          user_id: userId,
          file_id: fileId,
        }
        
        headers.forEach((header, index) => {
          const key = header.toLowerCase().replace(/\s+/g, '_')
          if (key.includes('name') || key.includes('姓名')) {
            record.employee_name = row[index] || ''
          } else if (key.includes('date') || key.includes('日期')) {
            record.date = row[index] || null
          } else if (key.includes('check_in') || key.includes('上班')) {
            record.check_in = row[index] || null
          } else if (key.includes('check_out') || key.includes('下班')) {
            record.check_out = row[index] || null
          } else if (key.includes('status') || key.includes('状态')) {
            record.status = row[index] || 'present'
          } else if (key.includes('notes') || key.includes('备注')) {
            record.notes = row[index] || null
          }
        })
        return record
      })

      const { error: recordsError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecords as any)

      if (recordsError) {
        console.error('考勤记录保存错误:', recordsError)
        throw new Error('考勤记录保存失败: ' + recordsError.message)
      }

      await supabase
        .from('edit_history')
        .insert({
          file_id: fileId,
          user_id: userId,
          action: 'create',
          description: `上传并创建了文件 "${fileName}"，包含 ${rows.length} 条记录，原始标题: ${originalHeaders.join(', ')}`,
        })

      alert('保存成功！')
    } catch (error: any) {
      console.error('保存失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, fileName)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="space-y-4">
      {showMappingModal && unmatchedHeaders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 mb-2">检测到不匹配的列标题</h3>
              <p className="text-sm text-yellow-700 mb-3">
                以下列标题与标准格式不匹配，请选择如何处理：
              </p>
              
              <div className="space-y-2 mb-4">
                {unmatchedHeaders.map(header => (
                  <div key={header} className="flex items-center gap-3 bg-white p-2 rounded border">
                    <span className="font-medium text-gray-700 min-w-[100px]">{header}</span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={columnMapping.get(header) || ''}
                      onChange={(e) => handleHeaderMappingChange(header, e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">保留原始标题</option>
                      {STANDARD_HEADERS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={applyHeaderMapping}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  应用映射
                </button>
                <button
                  onClick={keepOriginalHeaders}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  保留原始标题
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="font-medium text-gray-900 border-none focus:ring-0 p-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加行
            </button>
            {selectedRows.size > 0 && (
              <button
                onClick={deleteSelectedRows}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除选中 ({selectedRows.size})
              </button>
            )}
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={saveToDatabase}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? '保存中...' : '保存'}
            </button>
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
          {!useOriginalHeaders && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Info className="w-4 h-4" />
              已应用标题映射
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序号
                </th>
                {headers.map((header, index) => {
                  const isMapped = columnMapping.get(originalHeaders[index]) && columnMapping.get(originalHeaders[index]) !== originalHeaders[index]
                  return (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-1">
                        {header}
                        {isMapped && (
                          <span className="text-blue-500 text-[10px]" title={`原始: ${originalHeaders[index]}`}>
                            *
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-50 ${
                    selectedRows.has(rowIndex) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => toggleRowSelection(rowIndex)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
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
                        <span className="cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded -mx-2">
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

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium mb-2">快捷键：</p>
        <div className="flex flex-wrap gap-4">
          <span>Enter - 保存编辑</span>
          <span>Escape - 取消编辑</span>
          <span>点击单元格 - 编辑</span>
        </div>
      </div>
    </div>
  )
}
