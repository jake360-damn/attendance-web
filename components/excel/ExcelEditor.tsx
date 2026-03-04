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
  Search
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

      // 保存文件信息
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

      // 保存原始格式数据
      const { error: rawDataError } = await supabase
        .from('excel_data_raw')
        .insert({
          file_id: fileId,
          headers: headers,
          rows: rows,
        } as any)

      if (rawDataError) {
        console.error('原始数据保存错误:', rawDataError)
        throw new Error('原始数据保存失败: ' + rawDataError.message)
      }

      // 记录编辑历史
      await supabase
        .from('edit_history')
        .insert({
          file_id: fileId,
          user_id: userId,
          action: 'create',
          description: `上传并创建了文件 "${fileName}"，包含 ${rows.length} 条记录，标题: ${headers.join(', ')}`,
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
                className="font-medium text-gray-900 border-none focus:ring-0 p-0 bg-transparent"
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
