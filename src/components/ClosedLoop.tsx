import type { LoopState } from '../types'
import { STATUS_LABELS, STATUS_ORDER } from '../services/loop'

interface Props {
  loopState: LoopState
  attemptCount: number
  allPassed: boolean
  onReset: () => void
}

export default function ClosedLoop({ loopState, attemptCount, allPassed, onReset }: Props) {
  const currentIndex = STATUS_ORDER.indexOf(loopState.status)
  const rate = Math.min(100, (attemptCount === 0 ? 100 : Math.round((1 / attemptCount) * 100)))

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800">通知闭环看板</h2>
      <p className="text-sm text-slate-500 mb-6">追踪从通知推送到患者确认的完整闭环</p>

      <div className="flex flex-col items-center mb-8">
        <div className="relative w-48 h-48 mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50" cy="50" r="42"
              fill="none" stroke="#e2e8f0" strokeWidth="10"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={allPassed ? '#16a34a' : '#f59e0b'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${allPassed ? 264 : rate * 2.64} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-700">{allPassed ? '100' : rate}%</span>
            <span className="text-xs text-slate-400">闭环率</span>
          </div>
        </div>

        <span
          className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
            allPassed
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {allPassed ? '已闭环 ✓' : `未闭环 · 第 ${attemptCount} 次尝试`}
        </span>
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-slate-700 mb-3">通知流转状态</h3>
        <div className="flex items-center gap-0 overflow-x-auto">
          {STATUS_ORDER.map((status, i) => {
            const isActive = i <= currentIndex
            const isLast = i === STATUS_ORDER.length - 1
            return (
              <div key={status} className="flex items-center gap-0 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                  >
                    {isActive ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 whitespace-nowrap ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      i < currentIndex ? 'bg-blue-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">{attemptCount}</div>
          <div className="text-xs text-slate-400">尝试次数</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">
            {allPassed ? '✓' : '—'}
          </div>
          <div className="text-xs text-slate-400">最终状态</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">
            {allPassed ? rate : '—'}%
          </div>
          <div className="text-xs text-slate-400">通过率</div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-lg font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 cursor-pointer transition-all"
        >
          重新开始
        </button>
      </div>
    </div>
  )
}
