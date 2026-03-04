'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'

interface ExcelUploaderProps {
  onUpload: (data: any) => void
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
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length === 0) {
          setError('文件为空')
          return
        }

        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[]

        onUpload({
          headers,
          rows,
          fileName: file.name,
          fileSize: file.size,
        })
      } catch (err) {
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
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
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
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">正在解析文件...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                {isDragActive ? (
                  <Upload className="w-8 h-8 text-blue-600" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                )}
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {isDragActive ? '释放文件以上传' : '点击或拖拽上传 Excel 文件'}
                </p>
                <p className="text-sm text-gray-500">
                  支持 .xlsx 和 .xls 格式
                </p>
              </div>
            </div>
          )}
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">文件格式要求：</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>第一行为表头（列标题）</li>
          <li>从第二行开始为数据</li>
          <li>支持常见考勤字段：姓名、日期、上班时间、下班时间、状态等</li>
        </ul>
      </div>
    </div>
  )
}
