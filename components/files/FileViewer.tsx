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
  Maximize2,
  Merge,
  Split,
  Snowflake
} from 'lucide-react'

interface MergeRange {
  s: { r: number; c: number }
  e: { r: number; c: number }
}

interface FileViewerProps {
  file: SharedFile
  currentUser: User | null
  onBack: () => void
  onViewHistory: () => void
}

interface HistoryState {
  allData: any[][]
  columnWidths: number[]
  rowHeights: number[]
  merges: MergeRange[]
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
  const [allData, setAllData] = useState<any[][]>([])
  const headers = allData[0] || []
  const rows = allData.slice(1)
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
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{row: number, col: number} | null>(null)
  
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [rowHeights, setRowHeights] = useState<number[]>([])
  const [merges, setMerges] = useState<MergeRange[]>([])
  const [frozenRows, setFrozenRows] = useState<number>(0)
  const [showFreezeDialog, setShowFreezeDialog] = useState(false)
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
      setAllData(prevState.allData)
      setColumnWidths(prevState.columnWidths)
      setRowHeights(prevState.rowHeights)
      setMerges(prevState.merges)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setAllData(nextState.allData)
      setColumnWidths(nextState.columnWidths)
      setRowHeights(nextState.rowHeights)
      setMerges(nextState.merges)
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
        const loadedAllData: any[][] = rawData.all_data || []
        const loadedHeaders = loadedAllData[0] || []
        const loadedRows = loadedAllData.slice(1)
        
        let loadedColWidths = rawData.column_widths
        let loadedRowHeights = rawData.row_heights
        const loadedMerges: MergeRange[] = rawData.merges || []
        const loadedFrozenRows = rawData.frozen_rows || 0
        
        if (!loadedColWidths || !loadedRowHeights) {
          const autoFormat = calculateAutoFormat(loadedHeaders, loadedRows)
          loadedColWidths = autoFormat.columnWidths
          loadedRowHeights = autoFormat.rowHeights
        }
        
        setAllData(loadedAllData)
        setRawDataId(rawData.id)
        setColumnWidths(loadedColWidths)
        setRowHeights(loadedRowHeights)
        setMerges(loadedMerges)
        setFrozenRows(loadedFrozenRows)
        
        const initialState: HistoryState = {
          allData: loadedAllData,
          columnWidths: loadedColWidths,
          rowHeights: loadedRowHeights,
          merges: loadedMerges
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
          
          const recordAllData = [recordHeaders, ...recordRows]
          const autoFormat = calculateAutoFormat(recordHeaders, recordRows)
          
          setAllData(recordAllData)
          setColumnWidths(autoFormat.columnWidths)
          setRowHeights(autoFormat.rowHeights)
          setMerges([])
          
          const initialState: HistoryState = {
            allData: recordAllData,
            columnWidths: autoFormat.columnWidths,
            rowHeights: autoFormat.rowHeights,
            merges: []
          }
          setHistory([initialState])
          setHistoryIndex(0)
        } else {
          setAllData([])
        }
      }
    } catch (error) {
      console.error('获取文件数据失败:', error)
      setAllData([])
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

    const newAllData = [...allData]
    newAllData[row + 1][col] = editValue
    setAllData(newAllData)
    setEditingCell(null)
    setEditValue('')
    
    saveToHistory({
      allData: newAllData,
      columnWidths,
      rowHeights,
      merges
    })

    if (rawDataId) {
      try {
        const newHeaders = newAllData[0]
        const newRows = newAllData.slice(1)
        await supabase
          .from('excel_data_raw')
          .update({ 
            all_data: newAllData,
            headers: newHeaders,
            rows: newRows
          })
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
    const newAllData = [...allData, newRow]
    setAllData(newAllData)
    setRowHeights([...rowHeights, DEFAULT_ROW_HEIGHT])
    
    saveToHistory({
      allData: newAllData,
      columnWidths,
      rowHeights: [...rowHeights, DEFAULT_ROW_HEIGHT],
      merges
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
    const newAllData = [headers, ...newRows]
    
    setSavingChanges(true)
    try {
      await supabase
        .from('excel_data_raw')
        .update({ 
          all_data: newAllData, 
          headers: headers,
          rows: newRows,
          row_heights: newRowHeights 
        })
        .eq('id', rawDataId)

      await supabase
        .from('edit_history')
        .insert({
          file_id: file.id,
          user_id: currentUser?.id,
          action: 'delete',
          description: `删除了 ${deletedRowIndices.length} 行数据（原第 ${deletedRowIndices.map(i => i + 1).join(', ')} 行）`,
        })

      setAllData(newAllData)
      setRowHeights(newRowHeights)
      setSelectedRows(new Set())
      
      saveToHistory({
        allData: newAllData,
        columnWidths,
        rowHeights: newRowHeights,
        merges
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
          all_data: allData,
          headers: headers,
          rows: rows,
          row_heights: rowHeights,
          column_widths: columnWidths,
          merges: merges,
          frozen_rows: frozenRows,
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
          allData,
          columnWidths,
          rowHeights,
          merges
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
  }, [resizingCol, resizingRow, startX, startY, startWidth, startHeight, columnWidths, rowHeights, allData, saveToHistory])

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

    const newRowHeights = allData.map((row, rowIndex) => {
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
      allData,
      columnWidths: newColWidths,
      rowHeights: newRowHeights,
      merges
    })
  }

  const resetFormat = () => {
    const newColWidths = headers.map(() => DEFAULT_COLUMN_WIDTH)
    const newRowHeights = allData.map(() => DEFAULT_ROW_HEIGHT)
    
    setColumnWidths(newColWidths)
    setRowHeights(newRowHeights)
    
    saveToHistory({
      allData,
      columnWidths: newColWidths,
      rowHeights: newRowHeights,
      merges
    })
  }

  const getCellMergeInfo = (rowIndex: number, colIndex: number) => {
    for (const merge of merges) {
      if (rowIndex >= merge.s.r && rowIndex <= merge.e.r &&
          colIndex >= merge.s.c && colIndex <= merge.e.c) {
        const isStart = rowIndex === merge.s.r && colIndex === merge.s.c
        const rowSpan = merge.e.r - merge.s.r + 1
        const colSpan = merge.e.c - merge.s.c + 1
        return {
          isMerged: true,
          isStart,
          rowSpan: isStart ? rowSpan : 0,
          colSpan: isStart ? colSpan : 0,
          shouldHide: !isStart
        }
      }
    }
    return { isMerged: false, isStart: false, rowSpan: 1, colSpan: 1, shouldHide: false }
  }

  const getSelectedCellRange = () => {
    if (selectedCells.size === 0) return null
    
    const cells = Array.from(selectedCells).map(key => {
      const [row, col] = key.split(',').map(Number)
      return { row, col }
    })
    
    const minRow = Math.min(...cells.map(c => c.row))
    const maxRow = Math.max(...cells.map(c => c.row))
    const minCol = Math.min(...cells.map(c => c.col))
    const maxCol = Math.max(...cells.map(c => c.col))
    
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1)
    if (selectedCells.size !== expectedCount) return null
    
    return { minRow, maxRow, minCol, maxCol }
  }

  const isRectangularSelection = () => {
    return getSelectedCellRange() !== null
  }

  const getMergesInSelection = () => {
    const range = getSelectedCellRange()
    if (!range) return []
    
    return merges.filter(merge => 
      merge.s.r >= range.minRow && merge.e.r <= range.maxRow &&
      merge.s.c >= range.minCol && merge.e.c <= range.maxCol
    )
  }

  const mergeSelectedCells = () => {
    if (!canEdit) return
    
    const range = getSelectedCellRange()
    if (!range) {
      alert('请选择一个矩形区域进行合并')
      return
    }
    
    if (range.minRow === range.maxRow && range.minCol === range.maxCol) {
      alert('请至少选择2个单元格进行合并')
      return
    }
    
    const existingMerges = getMergesInSelection()
    if (existingMerges.length > 0) {
      alert('选区内已存在合并单元格，请先取消合并')
      return
    }
    
    const newMerge: MergeRange = {
      s: { r: range.minRow, c: range.minCol },
      e: { r: range.maxRow, c: range.maxCol }
    }
    
    const newMerges = [...merges, newMerge]
    setMerges(newMerges)
    setSelectedCells(new Set())
    
    saveToHistory({
      allData,
      columnWidths,
      rowHeights,
      merges: newMerges
    })
  }

  const unmergeSelectedCells = () => {
    if (!canEdit) return
    
    const mergesInSelection = getMergesInSelection()
    if (mergesInSelection.length === 0) {
      alert('选区内没有合并单元格')
      return
    }
    
    const newMerges = merges.filter(merge => !mergesInSelection.includes(merge))
    setMerges(newMerges)
    setSelectedCells(new Set())
    
    saveToHistory({
      allData,
      columnWidths,
      rowHeights,
      merges: newMerges
    })
  }

  const handleCellMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (!canEdit) return
    
    if (e.shiftKey && selectionStart) {
      const minRow = Math.min(selectionStart.row, rowIndex)
      const maxRow = Math.max(selectionStart.row, rowIndex)
      const minCol = Math.min(selectionStart.col, colIndex)
      const maxCol = Math.max(selectionStart.col, colIndex)
      
      const newSelection = new Set<string>()
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(`${r},${c}`)
        }
      }
      setSelectedCells(newSelection)
    } else {
      setIsSelecting(true)
      setSelectionStart({ row: rowIndex, col: colIndex })
      setSelectedCells(new Set([`${rowIndex},${colIndex}`]))
    }
  }

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (!isSelecting || !selectionStart) return
    
    const minRow = Math.min(selectionStart.row, rowIndex)
    const maxRow = Math.max(selectionStart.row, rowIndex)
    const minCol = Math.min(selectionStart.col, colIndex)
    const maxCol = Math.max(selectionStart.col, colIndex)
    
    const newSelection = new Set<string>()
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newSelection.add(`${r},${c}`)
      }
    }
    setSelectedCells(newSelection)
  }

  const handleCellMouseUp = () => {
    setIsSelecting(false)
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false)
    }
    
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const getFrozenRowHeight = () => {
    if (frozenRows === 0) return 0
    return rowHeights.slice(0, frozenRows).reduce((a, b) => a + b, 0)
  }

  const isRowFrozen = (rowIndex: number) => {
    return rowIndex < frozenRows
  }

  const getRowStyle = (rowIndex: number) => {
    if (frozenRows === 0 || rowIndex >= frozenRows) return {}
    
    const topOffset = rowHeights.slice(0, rowIndex).reduce((a, b) => a + b, 0)
    return {
      position: 'sticky' as const,
      top: topOffset,
      zIndex: 5,
      backgroundColor: '#f9fafb'
    }
  }

  const exportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet(allData)
    
    if (merges.length > 0) {
      worksheet['!merges'] = merges
    }
    
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
                <div className="h-6 w-px bg-gray-200 mx-1" />
                <button
                  onClick={mergeSelectedCells}
                  disabled={selectedCells.size < 2 || !isRectangularSelection()}
                  className="btn btn-secondary disabled:opacity-50"
                  title="合并选中的单元格"
                >
                  <Merge className="w-4 h-4" />
                  合并
                </button>
                <button
                  onClick={unmergeSelectedCells}
                  disabled={getMergesInSelection().length === 0}
                  className="btn btn-secondary disabled:opacity-50"
                  title="取消合并选中的单元格"
                >
                  <Split className="w-4 h-4" />
                  取消合并
                </button>
                {isAdmin && (
                  <>
                    <div className="h-6 w-px bg-gray-200 mx-1" />
                    <button
                      onClick={() => setShowFreezeDialog(true)}
                      className={`btn ${frozenRows > 0 ? 'bg-blue-100 text-blue-700 border-blue-300' : 'btn-secondary'}`}
                      title="设置冻结行数"
                    >
                      <Snowflake className="w-4 h-4" />
                      {frozenRows > 0 ? `冻结 ${frozenRows} 行` : '冻结行'}
                    </button>
                  </>
                )}
                <div className="h-6 w-px bg-gray-200 mx-1" />
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

      {allData.length > 0 ? (
        <div className="table-container">
          <div className="overflow-auto max-h-[600px]" style={{ maxWidth: '100%' }}>
            <table className="w-full border-collapse" ref={tableRef} style={{ tableLayout: 'fixed' }}>
              <tbody>
                {allData.map((row, rowIndex) => {
                  const isFrozen = isRowFrozen(rowIndex)
                  const rowStyle = getRowStyle(rowIndex)
                  const isHeaderRow = rowIndex === 0
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`border-b border-gray-100 transition-colors ${
                        selectedRows.has(rowIndex) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      } ${resizingRow === rowIndex ? 'bg-blue-100' : ''} ${
                        isFrozen ? 'bg-gray-50' : ''
                      } ${isHeaderRow ? 'bg-gradient-to-r from-gray-50 to-gray-100' : ''}`}
                      style={{ 
                        height: rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT,
                        ...rowStyle
                      }}
                    >
                      {canEdit && (
                        <td className="border-r border-gray-200 px-2 py-2 text-center bg-gray-50/50">
                          {isHeaderRow ? (
                            <input
                              type="checkbox"
                              checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedRows.has(rowIndex - 1)}
                              onChange={() => toggleRowSelection(rowIndex - 1)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        </td>
                      )}
                      <td className={`border-r border-gray-200 px-2 py-2 text-gray-400 font-medium text-center ${isFrozen ? 'bg-gray-100' : 'bg-gray-50/50'}`}>
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, colIndex) => {
                        const mergeInfo = getCellMergeInfo(rowIndex, colIndex)
                        const isSelected = selectedCells.has(`${rowIndex},${colIndex}`)
                        
                        if (mergeInfo.shouldHide) {
                          return null
                        }
                        
                        const CellTag = isHeaderRow ? 'th' : 'td'
                        
                        return (
                          <CellTag
                            key={colIndex}
                            className={`border-r border-gray-200 px-3 py-2 relative select-none ${
                              mergeInfo.isMerged ? 'bg-blue-50/50' : ''
                            } ${isSelected ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''} ${
                              isFrozen ? 'bg-gray-50' : ''
                            } ${isHeaderRow ? 'bg-gray-50 font-semibold text-gray-600' : ''}`}
                            style={{ 
                              width: mergeInfo.isMerged && mergeInfo.colSpan > 1
                                ? columnWidths.slice(colIndex, colIndex + mergeInfo.colSpan).reduce((a, b) => a + b, 0)
                                : (columnWidths[colIndex] || DEFAULT_COLUMN_WIDTH),
                              minWidth: MIN_COLUMN_WIDTH
                            }}
                            rowSpan={mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined}
                            colSpan={mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined}
                            onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                            onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                            onMouseUp={handleCellMouseUp}
                            onDoubleClick={() => startEdit(rowIndex, colIndex, cell)}
                          >
                            {canEdit && isHeaderRow && !mergeInfo.shouldHide && (
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 transition-colors z-20"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  handleColMouseDown(e, colIndex)
                                }}
                                title="拖动调整列宽"
                              />
                            )}
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
                                  canEdit && !isHeaderRow
                                    ? 'cursor-pointer hover:bg-amber-50 hover:text-amber-700 rounded px-1' 
                                    : 'cursor-default'
                                } ${mergeInfo.isMerged ? 'font-medium text-blue-800' : ''} ${isHeaderRow ? 'text-center' : ''}`}
                                style={{ 
                                  maxHeight: mergeInfo.isMerged && mergeInfo.rowSpan > 1 
                                    ? (rowHeights.slice(rowIndex, rowIndex + mergeInfo.rowSpan).reduce((a, b) => a + b, 0)) 
                                    : (rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT) - 16,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={String(cell || '')}
                              >
                                {(cell !== null && cell !== undefined && cell !== '') ? cell : '-'}
                              </div>
                            )}
                          </CellTag>
                        )
                      })}
                      <td className="relative">
                        {canEdit && (
                          <div
                            className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-blue-500 transition-colors z-20"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              handleRowMouseDown(e, rowIndex)
                            }}
                            title="拖动调整行高"
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
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
                  <span>拖动选择 - 选中多个单元格</span>
                  <span>双击单元格 - 编辑内容</span>
                  <span>Shift+点击 - 扩展选择</span>
                  <span>拖动列边界 - 调整列宽</span>
                  <span>拖动行底部 - 调整行高</span>
                  <span>Ctrl+Z - 撤销</span>
                  <span>Ctrl+Y - 重做</span>
                  <span className="text-purple-600 font-medium">合并 - 合并选中的单元格</span>
                  <span className="text-purple-600 font-medium">取消合并 - 拆分合并的单元格</span>
                </>
              )}
              {isAdmin && <span className="text-purple-600 font-medium">管理员可控制文件共享状态</span>}
            </div>
          </div>
        </div>
      </div>

      {showFreezeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">设置冻结行数</h3>
            <p className="text-sm text-gray-600 mb-4">
              冻结的行将在滚动时保持固定在顶部。表头行始终会显示。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  冻结行数（不含表头）
                </label>
                <input
                  type="number"
                  min="0"
                  max={rows.length}
                  value={frozenRows}
                  onChange={(e) => setFrozenRows(Math.max(0, Math.min(rows.length, parseInt(e.target.value) || 0)))}
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  当前将冻结 {frozenRows} 行数据（滚动时会固定在表头下方）
                </p>
              </div>
              
              {frozenRows > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <Snowflake className="w-4 h-4 inline mr-1" />
                    冻结功能已启用，前 {frozenRows} 行数据将固定显示
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFrozenRows(0)}
                  className="btn btn-secondary flex-1"
                >
                  取消冻结
                </button>
                <button
                  onClick={() => setShowFreezeDialog(false)}
                  className="btn btn-primary flex-1"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
