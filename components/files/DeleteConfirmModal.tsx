'use client'

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
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in max-w-md">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">确认删除</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="icon-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-gray-600 mb-3">
              你确定要删除以下文件吗？
            </p>
            <p className="font-medium text-gray-900 bg-gray-100 px-4 py-2.5 rounded-xl text-sm">
              {fileName}
            </p>
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                此操作不可撤销，文件及其所有数据将被永久删除
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="btn btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="btn btn-danger flex-1"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
