import type { CaseRecord } from '../types'

interface Props {
  cases: CaseRecord[]
  selectedId: string | null
  onSelect: (record: CaseRecord) => void
  onNext: () => void
}

export default function CaseSelect({ cases, selectedId, onSelect, onNext }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800">选择病例</h2>
      <p className="text-sm text-slate-500 mb-6">请选择一个预设口腔病历开始通俗化转换</p>

      <div className="flex flex-col gap-4">
        {cases.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${
              selectedId === c.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="font-semibold text-lg text-slate-800">{c.title}</div>
            <div className="text-sm text-slate-500 mt-1">{c.description}</div>
            <div className="text-xs text-slate-400 mt-2">
              {c.sections.length} 个章节 · {c.sections[1]?.content.slice(0, 30)}...
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 text-right">
        <button
          disabled={!selectedId}
          onClick={onNext}
          className="px-6 py-2.5 rounded-lg font-medium text-white transition-all
            bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
        >
          确认选择，开始 AI 转换
        </button>
      </div>
    </div>
  )
}
