import type { AnalysisResult, UploadedFile } from '../types'

interface Props {
  result: AnalysisResult | null
  loading: boolean
  files: UploadedFile[]
  onClose: () => void
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-500 w-16">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
        {score}
      </span>
    </div>
  )
}

export default function AnalysisView({ result, loading, files, onClose }: Props) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">🔍</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">AI 正在分析</h3>
          <p className="text-sm text-slate-500">对病历/处方的合规性、完整性进行审查…</p>
        </div>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">合规审查报告</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {files.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {files.map((f) =>
                f.previewUrl ? (
                  <img
                    key={f.id}
                    src={f.previewUrl}
                    alt={f.file.name}
                    className="h-32 rounded-lg border border-slate-200 object-cover flex-shrink-0"
                  />
                ) : null
              )}
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-700 mb-4">综合评分</h3>
            <div className="space-y-3">
              <ScoreBar score={result.completeness.score} label="完整性" />
              <ScoreBar score={result.compliance.score} label="规范性" />
            </div>
          </div>

          {result.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium">{result.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">缺失项</h4>
              {result.completeness.missing.length === 0 ? (
                <p className="text-xs text-green-600">暂未发现明显缺失</p>
              ) : (
                <ul className="space-y-1">
                  {result.completeness.missing.map((m, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                      <span className="mt-0.5">•</span> {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">规范性问题</h4>
              {result.compliance.issues.length === 0 ? (
                <p className="text-xs text-green-600">暂未发现明显问题</p>
              ) : (
                <ul className="space-y-1">
                  {result.compliance.issues.map((iss, i) => (
                    <li key={i} className="text-xs text-yellow-700 flex items-start gap-1">
                      <span className="mt-0.5">•</span> {iss}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {result.completeness.issues.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">内容问题</h4>
              <ul className="space-y-1">
                {result.completeness.issues.map((iss, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                    <span className="mt-0.5">•</span> {iss}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-orange-700 mb-2">⚠️ 风险提醒</h4>
            <ul className="space-y-1">
              {!result.riskAssessment.hasAllergyRecord && (
                <li className="text-xs text-orange-600 flex items-start gap-1">
                  <span className="mt-0.5">•</span> 未记录过敏史
                </li>
              )}
              {result.riskAssessment.hasSystemicDisease && (
                <li className="text-xs text-orange-600 flex items-start gap-1">
                  <span className="mt-0.5">•</span> 患者有全身疾病史，需注意治疗风险
                </li>
              )}
              {result.riskAssessment.warnings.map((w, i) => (
                <li key={i} className="text-xs text-orange-600 flex items-start gap-1">
                  <span className="mt-0.5">•</span> {w}
                </li>
              ))}
              {result.riskAssessment.warnings.length === 0 &&
                result.riskAssessment.hasAllergyRecord &&
                !result.riskAssessment.hasSystemicDisease && (
                  <li className="text-xs text-green-600">暂未发现高风险因素</li>
                )}
            </ul>
          </div>

          {result.followupScript && (
            <div className="border border-purple-200 bg-purple-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-purple-700 mb-2">💬 复诊话术建议</h4>
              <p className="text-sm text-purple-800 whitespace-pre-line leading-relaxed">
                {result.followupScript}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
