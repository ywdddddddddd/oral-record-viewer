import { useState } from 'react'

interface Props {
  onClose: () => void
  onSubmit: (title: string, content: string) => void
  loading: boolean
}

export default function CaseInput({ onClose, onSubmit, loading }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
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

        <label className="block text-sm font-medium text-slate-600 mb-1">
          粘贴病历内容
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请将专业口腔病历粘贴到这里（包括主诉、检查、诊断、治疗、医嘱等）&#10;&#10;例：&#10;主诉：右下后牙冷热痛3天，自发痛1天。&#10;现病史：患者3天前无明显诱因出现右下后牙冷热刺激痛…&#10;口腔检查：46牙远中邻面可见大面积龋坏…&#10;诊断：46慢性牙髓炎急性发作&#10;当日处理：…&#10;医嘱：…"
          rows={12}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-6 resize-none focus:outline-none focus:border-blue-500"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-slate-600 rounded-lg text-sm hover:bg-slate-100 cursor-pointer transition-all"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (content.trim()) onSubmit(title.trim(), content.trim())
            }}
            disabled={!content.trim() || loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {loading ? '处理中…' : 'AI 处理生成报告'}
          </button>
        </div>
      </div>
    </div>
  )
}
