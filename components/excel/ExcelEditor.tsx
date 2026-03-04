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
  Filter
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

export default function ExcelEditor({ data, onBack, userId }: ExcelEditorProps) {
  const [headers, setHeaders] = useState<string[]>(data.headers)
  const [rows, setRows] = useState<any[][]>(data.rows)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [fileName, setFileName] = useState(data.fileName)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    // 在客户端初始化 Supabase
    setSupabase(createBrowserClient())
  }, [])

  // 过滤行
  const filteredRows = rows.filter(row => 
    row.some(cell => 
      String(cell).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // 开始编辑单元格
  const startEdit = (rowIndex: number, colIndex: number, value: any) => {
    setEditingCell({ row: rowIndex, col: colIndex })
    setEditValue(String(value || ''))
  }

  // 保存单元格编辑
  const saveEdit = () => {
    if (!editingCell) return
    
    const newRows = [...rows]
    newRows[editingCell.row][editingCell.col] = editValue
    setRows(newRows)
    setEditingCell(null)
    setEditValue('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // 添加新行
  const addRow = () => {
    const newRow = new Array(headers.length).fill('')
    setRows([...rows, newRow])
  }

  // 删除选中行
  const deleteSelectedRows = () => {
    const newRows = rows.filter((_, index) => !selectedRows.has(index))
    setRows(newRows)
    setSelectedRows(new Set())
  }

  // 切换行选择
  const toggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    setSelectedRows(newSelected)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredRows.map((_, index) => index)))
    }
  }

  // 保存到数据库
  const saveToDatabase = async () => {
    if (!supabase) {
      alert('Supabase 客户端未初始化')
      return
    }
    
    setSaving(true)
    try {
      // 先保存文件信息
      const { data: fileData, error: fileError } = await supabase
        .from('excel_files')
        .insert({
          user_id: userId,
          file_name: fileName,
          file_size: data.fileSize,
          row_count: rows.length,
        } as any)
        .select()
        .single()

      if (fileError) throw fileError

      // 保存考勤记录
      const attendanceRecords = rows.map(row => {
        const record: any = {
          user_id: userId,
          file_id: (fileData as any).id,
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

      if (recordsError) throw recordsError

      alert('保存成功！')
    } catch (error: any) {
      console.error('保存失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // 导出Excel
  const exportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, fileName)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
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

        {/* 搜索栏 */}
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
        </div>
      </div>

      {/* 表格 */}
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

      {/* 快捷键提示 */}
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
