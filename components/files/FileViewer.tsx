'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Save,
  Undo2,
  Redo2,
  Wand2,
  Maximize2
} from 'lucide-react'

interface FileViewerProps {
  file: SharedFile
  currentUser: User | null
  onBack: () => void
  onViewHistory: () => void
}

interface HistoryState {
  rows: any[][]
  headers: string[]
  columnWidths: number[]
  rowHeights: number[]
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
  
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [rowHeights, setRowHeights] = useState<number[]>([])
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizingRow, setResizingRow] = useState<number | null>(null)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  const [startHeight, setStartHeight] = useState(0)
  
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  const tableRef = useRef<HTMLTableElement>(null)

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

  const saveToHistory = useCallback((newState: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setRows(prevState.rows)
      setHeaders(prevState.headers)
      setColumnWidths(prevState.columnWidths)
      setRowHeights(prevState.rowHeights)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setRows(nextState.rows)
      setHeaders(nextState.headers)
      setColumnWidths(nextState.columnWidths)
      setRowHeights(nextState.rowHeights)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex])

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
        const loadedHeaders = rawData.headers || []
        const loadedRows = rawData.rows || []
        
        let loadedColWidths = rawData.column_widths
        let loadedRowHeights = rawData.row_heights
        
        if (!loadedColWidths || !loadedRowHeights) {
          const autoFormat = calculateAutoFormat(loadedHeaders, loadedRows)
          loadedColWidths = autoFormat.columnWidths
          loadedRowHeights = autoFormat.rowHeights
        }
        
        setHeaders(loadedHeaders)
        setRows(loadedRows)
        setRawDataId(rawData.id)
        setColumnWidths(loadedColWidths)
        setRowHeights(loadedRowHeights)
        
        const initialState: HistoryState = {
          rows: loadedRows,
          headers: loadedHeaders,
          columnWidths: loadedColWidths,
          rowHeights: loadedRowHeights
        }
        setHistory([initialState])
        setHistoryIndex(0)
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
          
          const autoFormat = calculateAutoFormat(recordHeaders, recordRows)
          
          setHeaders(recordHeaders)
          setRows(recordRows)
          setColumnWidths(autoFormat.columnWidths)
          setRowHeights(autoFormat.rowHeights)
          
          const initialState: HistoryState = {
            rows: recordRows,
            headers: recordHeaders,
            columnWidths: autoFormat.columnWidths,
            rowHeights: autoFormat.rowHeights
          }
          setHistory([initialState])
          setHistoryIndex(0)
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
    
    saveToHistory({
      rows: newRows,
      headers,
      columnWidths,
      rowHeights
    })

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
    const newRows = [...rows, newRow]
    setRows(newRows)
    setRowHeights([...rowHeights, DEFAULT_ROW_HEIGHT])
    
    saveToHistory({
      rows: newRows,
      headers,
      columnWidths,
      rowHeights: [...rowHeights, DEFAULT_ROW_HEIGHT]
    })
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
    const newRowHeights = rowHeights.filter((_, index) => !selectedRows.has(index))
    
    setSavingChanges(true)
    try {
      await supabase
        .from('excel_data_raw')
        .update({ rows: newRows, row_heights: newRowHeights })
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
      setRowHeights(newRowHeights)
      setSelectedRows(new Set())
      
      saveToHistory({
        rows: newRows,
        headers,
        columnWidths,
        rowHeights: newRowHeights
      })
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
          row_heights: rowHeights,
          column_widths: columnWidths,
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

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault()
      redo()
    }
  }, [undo, redo])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  const handleColMouseDown = (e: React.MouseEvent, colIndex: number) => {
    if (!canEdit) return
    e.preventDefault()
    setResizingCol(colIndex)
    setStartX(e.clientX)
    setStartWidth(columnWidths[colIndex] || DEFAULT_COLUMN_WIDTH)
  }

  const handleRowMouseDown = (e: React.MouseEvent, rowIndex: number) => {
    if (!canEdit) return
    e.preventDefault()
    setResizingRow(rowIndex)
    setStartY(e.clientY)
    setStartHeight(rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol !== null) {
        const diff = e.clientX - startX
        const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + diff)
        const newWidths = [...columnWidths]
        newWidths[resizingCol] = newWidth
        setColumnWidths(newWidths)
      }
      if (resizingRow !== null) {
        const diff = e.clientY - startY
        const newHeight = Math.max(MIN_ROW_HEIGHT, startHeight + diff)
        const newHeights = [...rowHeights]
        newHeights[resizingRow] = newHeight
        setRowHeights(newHeights)
      }
    }

    const handleMouseUp = () => {
      if (resizingCol !== null || resizingRow !== null) {
        saveToHistory({
          rows,
          headers,
          columnWidths,
          rowHeights
        })
      }
      setResizingCol(null)
      setResizingRow(null)
    }

    if (resizingCol !== null || resizingRow !== null) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [resizingCol, resizingRow, startX, startY, startWidth, startHeight, columnWidths, rowHeights, rows, headers, saveToHistory])

  const autoFormat = () => {
    const newColWidths = headers.map((header, colIndex) => {
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

    const newRowHeights = rows.map((row, rowIndex) => {
      let maxHeight = DEFAULT_ROW_HEIGHT
      row.forEach((cell, colIndex) => {
        const cellValue = String(cell || '')
        const colWidth = newColWidths[colIndex] || DEFAULT_COLUMN_WIDTH
        const charsPerLine = Math.floor(colWidth / 10)
        if (cellValue.length > charsPerLine) {
          const lines = Math.ceil(cellValue.length / charsPerLine)
          maxHeight = Math.max(maxHeight, lines * 20 + 20)
        }
      })
      return Math.max(maxHeight, MIN_ROW_HEIGHT)
    })

    setColumnWidths(newColWidths)
    setRowHeights(newRowHeights)
    
    saveToHistory({
      rows,
      headers,
      columnWidths: newColWidths,
      rowHeights: newRowHeights
    })
  }

  const resetFormat = () => {
    const newColWidths = headers.map(() => DEFAULT_COLUMN_WIDTH)
    const newRowHeights = rows.map(() => DEFAULT_ROW_HEIGHT)
    
    setColumnWidths(newColWidths)
    setRowHeights(newRowHeights)
    
    saveToHistory({
      rows,
      headers,
      columnWidths: newColWidths,
      rowHeights: newRowHeights
    })
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

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="撤销 (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="重做 (Ctrl+Y)"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={autoFormat}
                  className="btn bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
                  title="自动调整格式"
                >
                  <Wand2 className="w-4 h-4" />
                  自动格式
                </button>
                <button
                  onClick={resetFormat}
                  className="btn btn-secondary"
                  title="重置为默认格式"
                >
                  <Maximize2 className="w-4 h-4" />
                  重置格式
                </button>
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
          <div className="overflow-auto max-h-[600px]" style={{ maxWidth: '100%' }}>
            <table className="w-full border-collapse" ref={tableRef} style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  {canEdit && (
                    <th className="w-12 min-w-[48px] border-b border-r border-gray-200 px-2 py-2 bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="w-16 min-w-[64px] border-b border-r border-gray-200 px-2 py-2 bg-gray-50 font-semibold text-gray-600">
                    #
                  </th>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="border-b border-r border-gray-200 px-3 py-2 bg-gray-50 font-semibold text-gray-600 relative select-none"
                      style={{ 
                        width: columnWidths[index] || DEFAULT_COLUMN_WIDTH,
                        minWidth: MIN_COLUMN_WIDTH
                      }}
                    >
                      <div className="truncate">{header}</div>
                      {canEdit && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors group"
                          onMouseDown={(e) => handleColMouseDown(e, index)}
                        >
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="w-8 min-w-[32px] border-b border-gray-200 bg-gray-50" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={`border-b border-gray-100 transition-colors ${
                      selectedRows.has(rowIndex) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } ${resizingRow === rowIndex ? 'bg-blue-100' : ''}`}
                    style={{ height: rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT }}
                  >
                    {canEdit && (
                      <td className="border-r border-gray-200 px-2 py-2 text-center bg-gray-50/50">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(rowIndex)}
                          onChange={() => toggleRowSelection(rowIndex)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="border-r border-gray-200 px-2 py-2 text-gray-400 font-medium text-center bg-gray-50/50">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className="border-r border-gray-200 px-3 py-2 relative"
                        style={{ 
                          width: columnWidths[colIndex] || DEFAULT_COLUMN_WIDTH,
                          minWidth: MIN_COLUMN_WIDTH
                        }}
                        onClick={() => startEdit(rowIndex, colIndex, cell)}
                      >
                        {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                          <div className="flex items-center gap-1 absolute inset-0 bg-white z-10 p-1 shadow-lg border border-blue-300 rounded">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="flex-1 px-2 py-1 border-0 focus:outline-none text-sm"
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
                          <div 
                            className={`text-sm overflow-hidden transition-colors ${
                              canEdit 
                                ? 'cursor-pointer hover:bg-amber-50 hover:text-amber-700 rounded px-1' 
                                : 'cursor-default'
                            }`}
                            style={{ 
                              maxHeight: (rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT) - 16,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={String(cell || '')}
                          >
                            {(cell !== null && cell !== undefined && cell !== '') ? cell : '-'}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="relative">
                      {canEdit && (
                        <div
                          className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize hover:bg-blue-400 transition-colors group"
                          onMouseDown={(e) => handleRowMouseDown(e, rowIndex)}
                        >
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-8 h-1 bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity rounded" />
                        </div>
                      )}
                    </td>
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
                  <span>拖动列边界 - 调整列宽</span>
                  <span>拖动行底部 - 调整行高</span>
                  <span>Ctrl+Z - 撤销</span>
                  <span>Ctrl+Y / Ctrl+Shift+Z - 重做</span>
                  <span className="text-purple-600 font-medium">自动格式 - 智能调整列宽行高</span>
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
