'use client'

import { useState, useEffect } from 'react'
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
  Table,
  Check,
  X as XIcon,
  Edit3
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

const DEFAULT_COLUMN_WIDTH = 150
const DEFAULT_ROW_HEIGHT = 40
const MIN_COLUMN_WIDTH = 50
const MIN_ROW_HEIGHT = 24

function calculateAutoFormat(headers: string[], rows: any[][]) {
  const columnWidths = headers.map((header, colIndex) => {
    let maxWidth = String(header).length * 10 + 40
    rows.forEach(row => {
      const cellValue = String(row[colIndex] || '')
      const cellWidth = cellValue.length * 10 + 20
      if (cellWidth > maxWidth) {
        maxWidth = Math.min(cellWidth, 400)
      }
    })
    return Math.max(maxWidth, MIN_COLUMN_WIDTH)
  })

  const rowHeights = rows.map((row, rowIndex) => {
    let maxHeight = DEFAULT_ROW_HEIGHT
    row.forEach((cell, colIndex) => {
      const cellValue = String(cell || '')
      const colWidth = columnWidths[colIndex] || DEFAULT_COLUMN_WIDTH
      const charsPerLine = Math.floor(colWidth / 10)
      if (cellValue.length > charsPerLine) {
        const lines = Math.ceil(cellValue.length / charsPerLine)
        maxHeight = Math.max(maxHeight, lines * 20 + 20)
      }
    })
    return Math.max(maxHeight, MIN_ROW_HEIGHT)
  })

  return { columnWidths, rowHeights }
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
    setSupabase(createBrowserClient())
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
          original_headers: headers,
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

      const { columnWidths, rowHeights } = calculateAutoFormat(headers, rows)

      const { error: rawDataError } = await supabase
        .from('excel_data_raw')
        .insert({
          file_id: fileId,
          headers: headers,
          rows: rows,
          column_widths: columnWidths,
          row_heights: rowHeights,
        } as any)

      if (rawDataError) {
        console.error('原始数据保存错误:', rawDataError)
        throw new Error('原始数据保存失败: ' + rawDataError.message)
      }

      await supabase
        .from('edit_history')
        .insert({
          file_id: fileId,
          user_id: userId,
          action: 'create',
          description: `上传并创建了文件 "${fileName}"，包含 ${rows.length} 条记录，标题: ${headers.join(', ')}`,
        })

      alert('保存成功！')
      onBack()
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
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="btn btn-ghost"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <div className="divider"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="font-semibold text-gray-900 border-none focus:ring-0 p-0 bg-transparent text-lg"
                />
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Table className="w-3.5 h-3.5" />
                  <span>{rows.length} 行数据</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              添加行
            </button>
            {selectedRows.size > 0 && (
              <button
                onClick={deleteSelectedRows}
                className="btn btn-danger"
              >
                <Trash2 className="w-4 h-4" />
                删除选中 ({selectedRows.size})
              </button>
            )}
            <button
              onClick={exportExcel}
              className="btn btn-success"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={saveToDatabase}
              disabled={saving}
              className="btn bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索数据..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-icon"
            />
          </div>
          <div className="text-sm text-gray-500">
            共 {rows.length} 行数据
            {searchTerm && ` (显示 ${filteredRows.length} 行)`}
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full">
            <thead className="table-header sticky top-0 z-10">
              <tr>
                <th className="table-cell w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="table-cell font-semibold text-gray-600 w-16">
                  #
                </th>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="table-cell font-semibold text-gray-600"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={`table-row ${selectedRows.has(rowIndex) ? 'bg-blue-50' : ''}`}
                >
                  <td className="table-cell">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => toggleRowSelection(rowIndex)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="table-cell text-gray-400 font-medium">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className="table-cell"
                      onClick={() => startEdit(rowIndex, colIndex, cell)}
                    >
                      {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded cursor-pointer hover:bg-amber-50 hover:text-amber-700 transition-colors">
                          {(cell !== null && cell !== undefined && cell !== '') ? cell : '-'}
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
          <div className="empty-state py-12">
            <Table className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? '没有找到匹配的数据' : '暂无数据，点击"添加行"开始'}
            </p>
          </div>
        )}
      </div>

      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Edit3 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900 mb-1">快捷键</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
              <span>Enter - 保存编辑</span>
              <span>Escape - 取消编辑</span>
              <span>点击单元格 - 编辑</span>
              <span>复选框 - 批量删除</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
