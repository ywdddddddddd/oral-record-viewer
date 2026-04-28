import { useState } from 'react'
import type { StoredCase, CaseStatus } from '../types'

interface Props {
  cases: StoredCase[]
  statusMap: Record<CaseStatus, { label: string; cls: string }>
  onViewPatient: (caseId: string) => void
  onDelete: (caseId: string) => void
  onReset: (caseId: string) => void
}

export default function CaseList({ cases, statusMap, onViewPatient, onDelete, onReset }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (cases.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm">还没有病例</p>
        <p className="text-xs mt-1">点击「新建病例」或选择模板快速开始</p>
      </div>
    )
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}${window.location.pathname}?case=${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function formatTime(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return `${Math.floor(diff / 86400000)} 天前`
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-600">病例列表（{cases.length}）</span>
      </div>
      <div className="divide-y divide-slate-100">
        {cases.map((c) => {
          const st = statusMap[c.status]
          return (
            <div key={c.id} className="px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {c.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {c.plainSections[0]?.plainContent?.slice(0, 50) ?? c.originalContent.slice(0, 50)}…
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {formatTime(c.createdAt)}
                    {c.completedAt && ` · 闭环于 ${formatTime(c.completedAt)}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {(c.status === 'ready' || c.status === 'sent' || c.status === 'completed') && (
                    <>
                      <button
                        onClick={() => copyLink(c.id)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-all whitespace-nowrap"
                      >
                        {copiedId === c.id ? '✓ 已复制' : '📋 复制链接'}
                      </button>
                      <button
                        onClick={() => onViewPatient(c.id)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 cursor-pointer transition-all whitespace-nowrap"
                      >
                        预览
                      </button>
                    </>
                  )}
                  {c.status === 'completed' && (
                    <button
                      onClick={() => onReset(c.id)}
                      className="px-2 py-1.5 text-slate-400 rounded-lg text-xs hover:text-orange-500 hover:bg-orange-50 cursor-pointer transition-all"
                      title="重置为待分享状态"
                    >
                      ↻
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(c.id)}
                    className="px-2 py-1.5 text-slate-300 rounded-lg text-xs hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
