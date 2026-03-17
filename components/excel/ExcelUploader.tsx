'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import Loading from '@/components/ui/Loading'
import { Upload, FileSpreadsheet, AlertCircle, Cloud, FileCheck } from 'lucide-react'

interface MergeRange {
  s: { r: number; c: number }
  e: { r: number; c: number }
}

interface CellStyle {
  alignment?: {
    horizontal?: string
    vertical?: string
    wrapText?: boolean
  }
  border?: {
    top?: { style: string }
    bottom?: { style: string }
    left?: { style: string }
    right?: { style: string }
    diagonal?: { style: string; up?: boolean; down?: boolean }
  }
  font?: {
    bold?: boolean
    italic?: boolean
    size?: number
  }
  fill?: {
    fgColor?: { rgb?: string }
  }
  numFmt?: string
}

interface CellData {
  value: any
  style?: CellStyle
  isDateTime?: boolean
  originalFormat?: string
}

interface ExcelUploaderProps {
  onUpload: (data: any) => void
}

function isDateFormat(numFmt: string | undefined): boolean {
  if (!numFmt) return false
  const lowerFmt = numFmt.toLowerCase()
  return lowerFmt.includes('yyyy') || 
         lowerFmt.includes('mm') || 
         lowerFmt.includes('dd') || 
         lowerFmt.includes('hh') ||
         lowerFmt.includes('ss') ||
         lowerFmt.includes('h:mm') ||
         lowerFmt.includes(':mm') ||
         lowerFmt.includes('am/pm') ||
         lowerFmt.includes('上午') ||
         lowerFmt.includes('下午')
}

function isTimeFormat(numFmt: string | undefined): boolean {
  if (!numFmt) return false
  const lowerFmt = numFmt.toLowerCase()
  return lowerFmt.includes('h:mm') || 
         lowerFmt.includes('hh:mm') ||
         lowerFmt.includes('h:mm:ss') ||
         lowerFmt.includes('hh:mm:ss') ||
         lowerFmt.includes(':mm') ||
         lowerFmt.includes('am/pm')
}

function formatExcelDate(value: number, numFmt?: string): string {
  if (typeof value !== 'number') return String(value)
  
  const totalDays = Math.floor(value)
  
  if (totalDays === 0) {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = (totalMinutes % 60).toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  const utcDays = totalDays - 25569
  const utcTime = utcDays * 86400
  const date = new Date(utcTime * 1000)
  
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  
  return `${month}月${day}日`
}

function extractCellStyle(cell: XLSX.CellObject): CellStyle | undefined {
  const style: CellStyle = {}
  let hasStyle = false
  
  if (cell.s) {
    const s = cell.s as any
    
    if (s.alignment) {
      style.alignment = {
        horizontal: s.alignment.horizontal,
        vertical: s.alignment.vertical,
        wrapText: s.alignment.wrapText
      }
      hasStyle = true
    }
    
    if (s.border) {
      style.border = {}
      if (s.border.top) style.border.top = { style: s.border.top.style }
      if (s.border.bottom) style.border.bottom = { style: s.border.bottom.style }
      if (s.border.left) style.border.left = { style: s.border.left.style }
      if (s.border.right) style.border.right = { style: s.border.right.style }
      if (s.border.diagonal) {
        style.border.diagonal = {
          style: s.border.diagonal.style,
          up: s.border.diagonal.up,
          down: s.border.diagonal.down
        }
      }
      hasStyle = true
    }
    
    if (s.font) {
      style.font = {
        bold: s.font.bold,
        italic: s.font.italic,
        size: s.font.sz
      }
      hasStyle = true
    }
    
    if (s.fill && s.fill.fgColor) {
      style.fill = {
        fgColor: { rgb: s.fill.fgColor.rgb }
      }
      hasStyle = true
    }
  }
  
  if (cell.z !== undefined) {
    style.numFmt = String(cell.z)
    hasStyle = true
  }
  
  return hasStyle ? style : undefined
}

function processCellValue(cell: XLSX.CellObject | undefined): CellData {
  if (!cell) {
    return { value: '' }
  }
  
  const style = extractCellStyle(cell)
  const numFmt = cell.z !== undefined ? String(cell.z) : undefined
  let value: any = cell.v
  let isDateTime = false
  let originalFormat = numFmt
  
  if (cell.t === 'd' && value instanceof Date) {
    isDateTime = true
    const month = value.getUTCMonth() + 1
    const day = value.getUTCDate()
    value = `${month}月${day}日`
  } else if (cell.t === 'n' && typeof value === 'number') {
    if (isTimeFormat(numFmt)) {
      isDateTime = true
      const totalMinutes = Math.round(value * 24 * 60)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = (totalMinutes % 60).toString().padStart(2, '0')
      value = `${hours}:${minutes}`
    } else if (isDateFormat(numFmt)) {
      isDateTime = true
      value = formatExcelDate(value, numFmt)
    }
  } else if (cell.t === 'b') {
    value = value ? '是' : '否'
  } else if (cell.w !== undefined) {
    if (isDateFormat(numFmt) || isTimeFormat(numFmt)) {
      isDateTime = true
    }
    value = cell.w
  }
  
  if (value === null || value === undefined) {
    value = ''
  }
  
  return {
    value: String(value),
    style,
    isDateTime,
    originalFormat
  }
}

export default function ExcelUploader({ onUpload }: ExcelUploaderProps) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const processExcel = (file: File) => {
    setUploading(true)
    setError('')

    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { 
          type: 'binary',
          cellDates: true,
          cellStyles: true,
          cellNF: true
        })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        const allData: CellData[][] = []
        
        for (let row = range.s.r; row <= range.e.r; row++) {
          const rowData: CellData[] = []
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]
            rowData.push(processCellValue(cell))
          }
          allData.push(rowData)
        }

        if (allData.length === 0) {
          setError('文件为空')
          return
        }

        const allMerges: MergeRange[] = worksheet['!merges'] || []
        
        const adjustedMerges = allMerges.map(merge => ({
          s: { r: merge.s.r, c: merge.s.c },
          e: { r: merge.e.r, c: merge.e.c }
        }))

        const simpleData = allData.map(row => 
          row.map(cell => cell.value)
        )
        
        const cellStyles: { [key: string]: CellStyle } = {}
        allData.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (cell.style) {
              cellStyles[`${rowIndex}-${colIndex}`] = cell.style
            }
          })
        })

        onUpload({
          allData: simpleData,
          cellData: allData,
          fileName: file.name,
          fileSize: file.size,
          merges: adjustedMerges,
          cellStyles,
        })
      } catch (err) {
        console.error('解析文件错误:', err)
        setError('解析文件失败，请检查文件格式')
      } finally {
        setUploading(false)
      }
    }

    reader.onerror = () => {
      setError('读取文件失败')
      setUploading(false)
    }

    reader.readAsBinaryString(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndProcess(file)
    }
  }

  const validateAndProcess = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('请上传 Excel 文件 (.xlsx 或 .xls)')
      return
    }

    processExcel(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      validateAndProcess(file)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="card p-4 bg-red-50 border-red-200 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative card p-12 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50/50 scale-[1.02] shadow-lg shadow-blue-500/10' 
            : 'border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
          }
        `}
      >
        <input 
          type="file" 
          accept=".xlsx,.xls" 
          onChange={handleFileChange}
          className="hidden"
          id="excel-upload"
        />
        <label htmlFor="excel-upload" className="cursor-pointer block">
          {uploading ? (
            <div className="space-y-6 animate-fade-in">
              <Loading size="lg" text="正在解析文件..." />
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`
                w-20 h-20 mx-auto rounded-2xl flex items-center justify-center
                transition-all duration-300
                ${isDragActive 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/30 scale-110' 
                  : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                }
              `}>
                {isDragActive ? (
                  <FileCheck className="w-10 h-10 text-white" />
                ) : (
                  <FileSpreadsheet className="w-10 h-10 text-blue-600" />
                )}
              </div>
              
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  {isDragActive ? '释放文件以上传' : '点击或拖拽上传 Excel 文件'}
                </p>
                <p className="text-gray-500">
                  支持 <span className="font-medium text-blue-600">.xlsx</span> 和 <span className="font-medium text-blue-600">.xls</span> 格式
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Upload className="w-4 h-4" />
                <span>拖拽文件到此处或点击选择</span>
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">文件格式要求</h4>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                第一行为表头（列标题）
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                从第二行开始为数据
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                支持常见考勤字段：姓名、日期、上班时间、下班时间、状态等
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                自动识别时间格式并正确显示
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
