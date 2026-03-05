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
  Info,
  Table,
  Edit3,
  Check,
  X as XIcon,
  Plus,
  Trash2,
  Save
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
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [savingChanges, setSavingChanges] = useState(false)

  const isAdmin = currentUser?.role === 'admin'
  const isOwner = file.uploader_name === currentUser?.full_name || 
                  file.uploader_email === currentUser?.email
  const canEdit = isShared || isOwner

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
      const { data: rawData, error: rawError } = await supabase
        .from('excel_data_raw')
        .select('*')
        .eq('file_id', file.id)
        .single()

      if (rawData && !rawError) {
        setHeaders(rawData.headers || [])
        setRows(rawData.rows || [])
        setRawDataId(rawData.id)
      } else {
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
    if (!canEdit) return
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

    if (rawDataId) {
      try {
        await supabase
          .from('excel_data_raw')
          .update({ rows: newRows })
          .eq('id', rawDataId)

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

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const addRow = () => {
    if (!canEdit) return
    const newRow = new Array(headers.length).fill('')
    setRows([...rows, newRow])
  }

  const toggleRowSelection = (rowIndex: number) => {
    if (!canEdit) return
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    setSelectedRows(newSelected)
  }

  const toggleSelectAll = () => {
    if (!canEdit) return
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredRows.map((_, index) => index)))
    }
  }

  const deleteSelectedRows = async () => {
    if (!canEdit || selectedRows.size === 0 || !supabase || !rawDataId) return
    
    const deletedRowIndices = Array.from(selectedRows).sort((a, b) => a - b)
    const newRows = rows.filter((_, index) => !selectedRows.has(index))
    
    setSavingChanges(true)
    try {
      await supabase
        .from('excel_data_raw')
        .update({ rows: newRows })
        .eq('id', rawDataId)

      await supabase
        .from('edit_history')
        .insert({
          file_id: file.id,
          user_id: currentUser?.id,
          action: 'delete',
          description: `删除了 ${deletedRowIndices.length} 行数据（原第 ${deletedRowIndices.map(i => i + 1).join(', ')} 行）`,
        })

      setRows(newRows)
      setSelectedRows(new Set())
    } catch (error) {
      console.error('删除行失败:', error)
      alert('删除失败')
    } finally {
      setSavingChanges(false)
    }
  }

  const saveAllChanges = async () => {
    if (!supabase || !rawDataId) return
    
    setSavingChanges(true)
    try {
      await supabase
        .from('excel_data_raw')
        .update({ 
          rows: rows,
          updated_at: new Date().toISOString()
        })
        .eq('id', rawDataId)

      await supabase
        .from('excel_files')
        .update({ 
          row_count: rows.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', file.id)

      alert('保存成功！')
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败')
    } finally {
      setSavingChanges(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
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
      <div className="card p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          </div>
          <p className="text-gray-500 font-medium">加载数据...</p>
        </div>
      </div>
    )
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
                <h2 className="font-semibold text-gray-900">{file.file_name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Table className="w-3.5 h-3.5" />
                  <span>{rows.length} 行数据</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
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
                    disabled={savingChanges}
                    className="btn btn-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除选中 ({selectedRows.size})
                  </button>
                )}
                <button
                  onClick={saveAllChanges}
                  disabled={savingChanges}
                  className="btn bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                >
                  {savingChanges ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingChanges ? '保存中...' : '保存'}
                </button>
              </>
            )}
            <button
              onClick={onViewHistory}
              className="btn btn-secondary"
            >
              <Clock className="w-4 h-4" />
              修改历史
            </button>
            <button
              onClick={exportExcel}
              className="btn btn-success"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            {isAdmin && (
              <button
                onClick={toggleShare}
                disabled={saving}
                className={isShared ? "btn btn-warning" : "btn btn-primary"}
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
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {searchTerm && `显示 ${filteredRows.length} / ${rows.length} 行`}
            </div>
            {isShared ? (
              <span className="badge badge-success">
                <Share2 className="w-3 h-3" />
                已共享
              </span>
            ) : (
              <span className="badge badge-muted">
                <Lock className="w-3 h-3" />
                私有
              </span>
            )}
          </div>
        </div>
      </div>

      {headers.length > 0 ? (
        <div className="table-container">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full">
              <thead className="table-header sticky top-0 z-10">
                <tr>
                  {canEdit && (
                    <th className="table-cell w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
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
                  <tr key={rowIndex} className={`table-row ${selectedRows.has(rowIndex) ? 'bg-blue-50' : ''}`}>
                    {canEdit && (
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(rowIndex)}
                          onChange={() => toggleRowSelection(rowIndex)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
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
                          <span className={`inline-block px-2 py-1 rounded transition-colors ${
                            canEdit 
                              ? 'cursor-pointer hover:bg-amber-50 hover:text-amber-700' 
                              : 'cursor-default'
                          }`}>
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
              <Search className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">没有找到匹配的数据</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-16">
          <div className="empty-state">
            <Info className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-1">暂无数据</p>
            <p className="text-gray-500">该文件没有任何数据</p>
          </div>
        </div>
      )}

      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Edit3 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900 mb-1">操作说明</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
              {canEdit && (
                <>
                  <span>点击单元格 - 编辑内容</span>
                  <span>Enter - 保存编辑</span>
                  <span>Escape - 取消编辑</span>
                  <span>复选框 - 批量删除</span>
                </>
              )}
              {isAdmin && <span className="text-purple-600 font-medium">管理员可控制文件共享状态</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
