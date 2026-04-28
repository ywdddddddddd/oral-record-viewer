import { useState } from 'react'
import type { PlainSection } from '../types'

interface Props {
  sections: PlainSection[]
  onMarkedSectionsChange: (markedIds: string[]) => void
  showMarkMode: boolean
  onConfirm: () => void
}

export default function PatientReport({
  sections,
  onMarkedSectionsChange,
  showMarkMode,
  onConfirm,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set())

  function toggleMark(id: string) {
    const next = new Set(markedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setMarkedIds(next)
    onMarkedSectionsChange(Array.from(next))
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800">
        {showMarkMode ? '标记没看懂的部分' : '您的口腔健康报告'}
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        {showMarkMode
          ? '请点击您觉得难以理解的内容，AI 将为您重新解释'
          : '以下是 AI 为您通俗化后的口腔健康报告，点击任意文字可查看原文'}
      </p>

      <div className="flex flex-col gap-3">
        {sections.map((s) => {
          const isMarked = markedIds.has(s.id) || s.isMarked
          const isExpanded = expandedId === s.id

          return (
            <div
              key={s.id}
              className={`border rounded-xl p-4 transition-all cursor-pointer ${
                showMarkMode && isMarked
                  ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                  : 'border-slate-200 bg-white hover:border-blue-200'
              }`}
              role="button"
              tabIndex={0}
              onClick={() => (showMarkMode ? toggleMark(s.id) : toggleExpand(s.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  showMarkMode ? toggleMark(s.id) : toggleExpand(s.id)
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-700">
                  {showMarkMode && isMarked && (
                    <span className="text-orange-500 mr-1">🔖</span>
                  )}
                  {s.title}
                </h3>
                <span className="text-xs text-slate-400">
                  {showMarkMode
                    ? isMarked
                      ? '已标记'
                      : '点击标记'
                    : isExpanded
                      ? '▲ 收起原文'
                      : '点击查看原文'}
                </span>
              </div>

              <p
                className={`text-slate-600 leading-relaxed text-sm whitespace-pre-line ${
                  s.reExplanation ? 'text-orange-700' : ''
                }`}
              >
                {s.reExplanation ?? s.plainContent}
              </p>

              {isExpanded && !showMarkMode && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 mb-1">← 原文对照</p>
                  <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                    {s.originalContent}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-right">
        <button
          onClick={onConfirm}
          className="px-6 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-all"
        >
          {showMarkMode ? '提交标记，让 AI 重新解释' : '我理解了，去确认问卷'}
        </button>
      </div>
    </div>
  )
}
