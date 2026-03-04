'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  fileName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
  isDeleting
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">确认删除</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-600 mb-2">
              你确定要删除以下文件吗？
            </p>
            <p className="font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">
              {fileName}
            </p>
            <p className="text-sm text-red-600 mt-4">
              ⚠️ 此操作不可撤销，文件及其所有数据将被永久删除。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  确认删除
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
