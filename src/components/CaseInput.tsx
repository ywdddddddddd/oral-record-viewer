import { useState } from 'react'
import type { UploadedFile } from '../types'
import FileUploader from './FileUploader'

interface Props {
  onClose: () => void
  onSubmit: (title: string, content: string) => void
  loading: boolean
}

export default function CaseInput({ onClose, onSubmit, loading }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')

  function handleSubmit() {
    if (inputMode === 'text') {
      if (content.trim()) onSubmit(title.trim(), content.trim())
    } else {
      const ocrText = files
        .filter((f) => f.ocrStatus === 'done')
        .map((f) => f.ocrText)
        .join('\n---\n')
      if (ocrText.trim()) onSubmit(title.trim(), ocrText)
    }
  }

  const canSubmit =
    inputMode === 'text'
      ? content.trim().length > 0
      : files.filter((f) => f.ocrStatus === 'done').length > 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">新建病例</h2>

        <label className="block text-sm font-medium text-slate-600 mb-1">
          病例标题（选填，AI 会自动生成）
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="如：右下后牙疼痛3天"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-500"
        />

        <div className="flex bg-slate-100 rounded-lg p-0.5 mb-4">
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              inputMode === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            粘贴文字
          </button>
          <button
            onClick={() => setInputMode('file')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              inputMode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            上传文件（PDF/图片）
          </button>
        </div>

        {inputMode === 'text' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请将专业口腔病历粘贴到这里（包括主诉、检查、诊断、治疗、医嘱等）"
            rows={14}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-6 resize-none focus:outline-none focus:border-blue-500"
          />
        ) : (
          <div className="mb-6">
            <FileUploader files={files} onFilesChange={setFiles} />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-slate-600 rounded-lg text-sm hover:bg-slate-100 cursor-pointer transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {loading ? '处理中…' : 'AI 处理生成报告'}
          </button>
        </div>
      </div>
    </div>
  )
}
