'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { SharedFile, User } from '@/types'
import * as XLSX from 'xlsx'
import Loading from '@/components/ui/Loading'
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
    
    // 处理表头编辑 (row = -1 表示表头)
    const isHeaderEdit = row === -1
    const actualRow = isHeaderEdit ? 0 : row + 1
    const oldValue = isHeaderEdit ? headers[col] : rows[row][col]
    
    if (oldValue === editValue) {
      setEditingCell(null)
      setEditValue('')
      return
    }

    const newAllData = [...allData]
    newAllData[actualRow][col] = editValue
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
            row_index: isHeaderEdit ? 0 : row,
            col_index: col,
            field_name: isHeaderEdit ? '表头' : headers[col],
            old_value: String(oldValue || ''),
            new_value: String(editValue || ''),
            description: isHeaderEdit 
              ? `修改了表头 "${oldValue}" 为 "${editValue}"`
              : `修改了第 ${row + 1} 行的 "${headers[col]}" 字段`,
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
      backgroundColor: '#1f2937'
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
      <div className="bg-gray-800/60 backdrop-blur-md rounded-xl p-12 shadow-lg border border-gray-700/50">
        <Loading text="加载数据..." />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gray-800/60 backdrop-blur-md rounded-xl p-5 shadow-lg border border-gray-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ease-in-out bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <div className="w-px h-6 bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-600/30">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{file.file_name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
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
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="撤销 (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="重做 (Ctrl+Y)"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={autoFormat}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-600/25"
                  title="自动调整格式"
                >
                  <Wand2 className="w-4 h-4" />
                  自动格式
                </button>
                <button
                  onClick={resetFormat}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600"
                  title="重置为默认格式"
                >
                  <Maximize2 className="w-4 h-4" />
                  重置格式
                </button>
                <div className="h-6 w-px bg-gray-600 mx-1" />
                <button
                  onClick={mergeSelectedCells}
                  disabled={selectedCells.size < 2 || !isRectangularSelection()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                  title="合并选中的单元格"
                >
                  <Merge className="w-4 h-4" />
                  合并
                </button>
                <button
                  onClick={unmergeSelectedCells}
                  disabled={getMergesInSelection().length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                  title="取消合并选中的单元格"
                >
                  <Split className="w-4 h-4" />
                  取消合并
                </button>
                {isAdmin && (
                  <>
                    <div className="h-6 w-px bg-gray-600 mx-1" />
                    <button
                      onClick={() => setShowFreezeDialog(true)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${frozenRows > 0 ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                      title="设置冻结行数"
                    >
                      <Snowflake className="w-4 h-4" />
                      {frozenRows > 0 ? `冻结 ${frozenRows} 行` : '冻结行'}
                    </button>
                  </>
                )}
                <div className="h-6 w-px bg-gray-600 mx-1" />
                <button
                  onClick={addRow}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25"
                >
                  <Plus className="w-4 h-4" />
                  添加行
                </button>
                {selectedRows.size > 0 && (
                  <button
                    onClick={deleteSelectedRows}
                    disabled={savingChanges}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-600/25"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除选中 ({selectedRows.size})
                  </button>
                )}
                <button
                  onClick={saveAllChanges}
                  disabled={savingChanges}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-700 text-white hover:from-indigo-700 hover:to-purple-800 shadow-lg shadow-indigo-600/25"
                >
                  {savingChanges ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 128 128" fill="none">
                      <circle className="opacity-25" cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" />
                      <path className="opacity-75" fill="currentColor" d="M64 8a56 56 0 0 1 56 56h-12a44 44 0 0 0-44-44V8z" />
                    </svg>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingChanges ? '保存中...' : '保存'}
                </button>
              </>
            )}
            <button
              onClick={onViewHistory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600"
            >
              <Clock className="w-4 h-4" />
              修改历史
            </button>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-600/25"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            {isAdmin && (
              <button
                onClick={toggleShare}
                disabled={saving}
                className={isShared ? "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 shadow-lg shadow-orange-600/25" : "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25"}
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 128 128" fill="none">
                    <circle className="opacity-25" cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" />
                    <path className="opacity-75" fill="currentColor" d="M64 8a56 56 0 0 1 56 56h-12a44 44 0 0 0-44-44V8z" />
                  </svg>
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
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">
              {searchTerm ? (
                <span className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded-full font-medium border border-yellow-600/30">
                    显示 {filteredRows.length} / {rows.length} 行
                  </span>
                </span>
              ) : (
                <span>共 {rows.length} 行数据</span>
              )}
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-sm text-yellow-400 hover:text-yellow-300 font-medium"
              >
                清除搜索
              </button>
            )}
            {isShared ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-medium border border-emerald-600/30">
                <Share2 className="w-3 h-3" />
                已共享
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 text-gray-400 rounded-full text-xs font-medium border border-gray-600">
                <Lock className="w-3 h-3" />
                私有
              </span>
            )}
          </div>
        </div>
      </div>

      {allData.length > 0 ? (
        <div className="bg-gray-800/60 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50 overflow-hidden">
          <div className="overflow-auto max-h-[600px]" style={{ maxWidth: '100%' }}>
            <table className="w-full border-collapse" ref={tableRef} style={{ tableLayout: 'fixed' }}>
              <tbody>
                {/* 表头行 - 始终显示 */}
                <tr 
                  className="border-b border-gray-600 transition-colors bg-gradient-to-r from-gray-800 to-gray-700"
                  style={{ 
                    height: rowHeights[0] || DEFAULT_ROW_HEIGHT,
                    ...(isRowFrozen(0) ? getRowStyle(0) : {})
                  }}
                >
                  {canEdit && (
                    <td className="border-r border-gray-600 px-2 py-2 text-center bg-gray-800/50">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-yellow-600 focus:ring-yellow-500/50"
                      />
                    </td>
                  )}
                  {/* 序号列已隐藏 - 用户有自己的序号列 */}
                  {headers.map((cell, colIndex) => {
                    const mergeInfo = getCellMergeInfo(0, colIndex)
                    if (mergeInfo.shouldHide) return null
                    return (
                      <th
                        key={colIndex}
                        className={`border-r border-gray-600 px-3 py-2 relative select-none bg-gray-800 font-semibold text-gray-300 ${
                          mergeInfo.isMerged ? 'bg-yellow-600/10' : ''
                        }`}
                        style={{ 
                          width: mergeInfo.isMerged && mergeInfo.colSpan > 1
                            ? columnWidths.slice(colIndex, colIndex + mergeInfo.colSpan).reduce((a, b) => a + b, 0)
                            : (columnWidths[colIndex] || DEFAULT_COLUMN_WIDTH),
                          minWidth: MIN_COLUMN_WIDTH
                        }}
                        rowSpan={mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined}
                        colSpan={mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined}
                        onMouseDown={(e) => handleCellMouseDown(0, colIndex, e)}
                        onMouseEnter={() => handleCellMouseEnter(0, colIndex)}
                        onMouseUp={handleCellMouseUp}
                        onDoubleClick={() => canEdit && startEdit(-1, colIndex, cell)}
                      >
                        {canEdit && !mergeInfo.shouldHide && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-yellow-500 transition-colors z-20"
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              handleColMouseDown(e, colIndex)
                            }}
                            title="拖动调整列宽"
                          />
                        )}
                        {editingCell?.row === -1 && editingCell?.col === colIndex ? (
                          <div className="flex items-center gap-1 absolute inset-0 bg-gray-800 z-10 p-1 shadow-lg border border-yellow-500/50 rounded">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="flex-1 px-2 py-1 border-0 focus:outline-none text-sm bg-gray-900 text-gray-200"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                              className="p-1 text-emerald-400 hover:bg-emerald-600/20 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                              className="p-1 text-red-400 hover:bg-red-600/20 rounded"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm overflow-hidden text-center cursor-pointer hover:bg-yellow-600/20 hover:text-yellow-400 rounded px-1 transition-colors text-gray-300">
                            {cell || '-'}
                          </div>
                        )}
                      </th>
                    )
                  })}
                  <td className="relative">
                    {canEdit && (
                      <div
                        className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-yellow-500 transition-colors z-20"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleRowMouseDown(e, 0)
                        }}
                        title="拖动调整行高"
                      />
                    )}
                  </td>
                </tr>
                {/* 冻结行 - 始终显示原始数据（不受搜索影响） */}
                {frozenRows > 0 && rows.slice(0, frozenRows).map((row, index) => {
                  const rowIndex = index + 1
                  const rowStyle = getRowStyle(rowIndex)
                  
                  return (
                    <tr 
                      key={`frozen-${index}`} 
                      className={`border-b border-gray-600 transition-colors bg-gray-800/80 ${
                        selectedRows.has(index) ? 'bg-yellow-600/20' : ''
                      } ${resizingRow === rowIndex ? 'bg-yellow-600/30' : ''}`}
                      style={{ 
                        height: rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT,
                        ...rowStyle
                      }}
                    >
                      {canEdit && (
                        <td className="border-r border-gray-600 px-2 py-2 text-center bg-gray-800/50">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(index)}
                            onChange={() => toggleRowSelection(index)}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-yellow-600 focus:ring-yellow-500/50"
                          />
                        </td>
                      )}
                      {/* 序号列已隐藏 - 用户有自己的序号列 */}
                      {row.map((cell, colIndex) => {
                        const mergeInfo = getCellMergeInfo(rowIndex, colIndex)
                        const isSelected = selectedCells.has(`${rowIndex},${colIndex}`)
                        
                        if (mergeInfo.shouldHide) {
                          return null
                        }
                        
                        return (
                          <td
                            key={colIndex}
                            className={`border-r border-gray-600 px-3 py-2 relative select-none ${
                              mergeInfo.isMerged ? 'bg-yellow-600/10' : ''
                            } ${isSelected ? 'bg-yellow-600/30 ring-2 ring-yellow-500/50 ring-inset' : ''}`}
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
                            {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                              <div className="flex items-center gap-1 absolute inset-0 bg-gray-800 z-10 p-1 shadow-lg border border-yellow-500/50 rounded">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="flex-1 px-2 py-1 border-0 focus:outline-none text-sm bg-gray-900 text-gray-200"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                                  className="p-1 text-emerald-400 hover:bg-emerald-600/20 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                  className="p-1 text-red-400 hover:bg-red-600/20 rounded"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`text-sm overflow-hidden transition-colors ${
                                  canEdit
                                    ? 'cursor-pointer hover:bg-yellow-600/20 hover:text-yellow-400 rounded px-1' 
                                    : 'cursor-default'
                                } ${mergeInfo.isMerged ? 'font-medium text-yellow-400' : 'text-gray-300'}`}
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
                          </td>
                        )
                      })}
                      <td className="relative">
                        {canEdit && (
                          <div
                            className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-yellow-500 transition-colors z-20"
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
                {/* 数据行 - 根据搜索过滤（排除冻结行） */}
                {filteredRows.filter(row => {
                  const originalIndex = rows.indexOf(row)
                  const rowIndex = originalIndex + 1
                  return rowIndex > frozenRows
                }).map((row, filteredIndex) => {
                  const originalIndex = rows.indexOf(row)
                  const rowIndex = originalIndex + 1
                  
                  return (
                    <tr 
                      key={filteredIndex} 
                      className={`border-b border-gray-600 transition-colors ${
                        selectedRows.has(originalIndex) ? 'bg-yellow-600/20' : 'hover:bg-gray-700/50'
                      } ${resizingRow === rowIndex ? 'bg-yellow-600/30' : ''}`}
                      style={{ 
                        height: rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT
                      }}
                    >
                      {canEdit && (
                        <td className="border-r border-gray-600 px-2 py-2 text-center bg-gray-800/50">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(originalIndex)}
                            onChange={() => toggleRowSelection(originalIndex)}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-yellow-600 focus:ring-yellow-500/50"
                          />
                        </td>
                      )}
                      {/* 序号列已隐藏 - 用户有自己的序号列 */}
                      {row.map((cell, colIndex) => {
                        const mergeInfo = getCellMergeInfo(rowIndex, colIndex)
                        const isSelected = selectedCells.has(`${rowIndex},${colIndex}`)
                        
                        if (mergeInfo.shouldHide) {
                          return null
                        }
                        
                        return (
                          <td
                            key={colIndex}
                            className={`border-r border-gray-600 px-3 py-2 relative select-none ${
                              mergeInfo.isMerged ? 'bg-yellow-600/10' : ''
                            } ${isSelected ? 'bg-yellow-600/30 ring-2 ring-yellow-500/50 ring-inset' : ''}`}
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
                            {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                              <div className="flex items-center gap-1 absolute inset-0 bg-gray-800 z-10 p-1 shadow-lg border border-yellow-500/50 rounded">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="flex-1 px-2 py-1 border-0 focus:outline-none text-sm bg-gray-900 text-gray-200"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                                  className="p-1 text-emerald-400 hover:bg-emerald-600/20 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                  className="p-1 text-red-400 hover:bg-red-600/20 rounded"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`text-sm overflow-hidden transition-colors ${
                                  canEdit
                                    ? 'cursor-pointer hover:bg-yellow-600/20 hover:text-yellow-400 rounded px-1' 
                                    : 'cursor-default'
                                } ${mergeInfo.isMerged ? 'font-medium text-yellow-400' : 'text-gray-300'}`}
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
                          </td>
                        )
                      })}
                      <td className="relative">
                        {canEdit && (
                          <div
                            className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-yellow-500 transition-colors z-20"
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
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Search className="w-12 h-12 text-gray-600 mb-4" />
              <p>没有找到匹配的数据</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/60 backdrop-blur-md rounded-xl p-16 shadow-lg border border-gray-700/50">
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Info className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-300 mb-1">暂无数据</p>
            <p className="text-gray-500">该文件没有任何数据</p>
          </div>
        </div>
      )}

      <div className="bg-gray-800/60 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-yellow-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-yellow-600/30">
            <Edit3 className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="font-medium text-gray-200 mb-1">操作说明</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
              {canEdit && (
                <>
                  <span>拖动选择 - 选中多个单元格</span>
                  <span>双击单元格 - 编辑内容</span>
                  <span>Shift+点击 - 扩展选择</span>
                  <span>拖动列边界 - 调整列宽</span>
                  <span>拖动行底部 - 调整行高</span>
                  <span>Ctrl+Z - 撤销</span>
                  <span>Ctrl+Y - 重做</span>
                  <span className="text-yellow-400 font-medium">合并 - 合并选中的单元格</span>
                  <span className="text-yellow-400 font-medium">取消合并 - 拆分合并的单元格</span>
                </>
              )}
              {isAdmin && <span className="text-yellow-400 font-medium">管理员可控制文件共享状态</span>}
            </div>
          </div>
        </div>
      </div>

      {showFreezeDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">设置冻结行数</h3>
            <p className="text-sm text-gray-400 mb-4">
              冻结的行将在滚动时保持固定在顶部。表头行始终会显示。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  冻结行数（不含表头）
                </label>
                <input
                  type="number"
                  min="0"
                  max={rows.length}
                  value={frozenRows}
                  onChange={(e) => setFrozenRows(Math.max(0, Math.min(rows.length, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  当前将冻结 {frozenRows} 行数据（滚动时会固定在表头下方）
                </p>
              </div>
              
              {frozenRows > 0 && (
                <div className="bg-yellow-600/10 rounded-lg p-3 border border-yellow-600/30">
                  <p className="text-sm text-yellow-400">
                    <Snowflake className="w-4 h-4 inline mr-1" />
                    冻结功能已启用，前 {frozenRows} 行数据将固定显示
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFrozenRows(0)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                  取消冻结
                </button>
                <button
                  onClick={() => setShowFreezeDialog(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:from-yellow-700 hover:to-yellow-800 shadow-lg shadow-yellow-600/25"
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
