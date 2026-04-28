import type { AnalysisResult, UploadedFile } from "../types"

interface Props {
  result: AnalysisResult | null
  loading: boolean
  files: UploadedFile[]
  onClose: () => void
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-500 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600"}`}>
        {score}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    present: { label: "完整", cls: "bg-green-100 text-green-700" },
    partial: { label: "部分", cls: "bg-yellow-100 text-yellow-700" },
    missing: { label: "缺失", cls: "bg-red-100 text-red-700" },
  }
  const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
}

export default function AnalysisView({ result, loading, files, onClose }: Props) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">🔍</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">AI 正在逐项审核</h3>
          <p className="text-sm text-slate-500">对照19节标准进行合规性、完整性审查…</p>
        </div>
      </div>
    )
  }

  if (!result) return null

  const gradeColor = result.totalScore >= 80 ? "text-green-600" : result.totalScore >= 60 ? "text-yellow-600" : "text-red-600"
  const gradeBg = result.totalScore >= 80 ? "bg-green-100" : result.totalScore >= 60 ? "bg-yellow-100" : "bg-red-100"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-800">病历合规审核报告</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {files.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {files.filter((f) => f.previewUrl).map((f) => (
                <img key={f.id} src={f.previewUrl} alt={f.file.name}
                  className="h-32 rounded-lg border border-slate-200 object-cover flex-shrink-0" />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-5">
            <div>
              <div className="text-xs text-slate-400 mb-1">综合评分</div>
              <div className={`text-4xl font-bold ${gradeColor}`}>{result.totalScore}</div>
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${gradeBg} ${gradeColor}`}>
                {result.totalScore >= 80 ? "良好" : result.totalScore >= 60 ? "基本合格" : "需改进"}
              </div>
            </div>
            <div className="space-y-2 flex-1 ml-8">
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
              <h4 className="text-sm font-semibold text-red-600 mb-3">缺失项</h4>
              {result.completeness.missing.length === 0 ? (
                <p className="text-xs text-green-600">暂未发现明显缺失</p>
              ) : (
                <ul className="space-y-1.5">
                  {result.completeness.missing.map((m, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">✗</span> {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-yellow-600 mb-3">规范性问题</h4>
              {result.compliance.issues.length === 0 ? (
                <p className="text-xs text-green-600">暂未发现明显问题</p>
              ) : (
                <ul className="space-y-1.5">
                  {result.compliance.issues.map((iss, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-yellow-500 mt-0.5">!</span> {iss}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {result.sections.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700">逐项审查</h4>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {result.sections.map((s, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{s.section}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${s.score >= 80 ? "text-green-600" : s.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                          {s.score}分
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                    {s.issues.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {s.issues.map((iss, j) => (
                          <li key={j} className="text-xs text-slate-500 pl-1">• {iss}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-orange-700 mb-3">风险提醒</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded-lg px-3 py-2 ${result.riskAssessment.hasAllergyRecord ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {result.riskAssessment.hasAllergyRecord ? "✓" : "✗"} 过敏史记录
              </div>
              <div className={`rounded-lg px-3 py-2 ${result.riskAssessment.hasSystemicDisease ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                {result.riskAssessment.hasSystemicDisease ? "⚠" : "✓"} 全身疾病
              </div>
              <div className={`rounded-lg px-3 py-2 ${result.riskAssessment.hasInfoboxConsent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {result.riskAssessment.hasInfoboxConsent ? "✓" : "✗"} 知情同意
              </div>
              <div className={`rounded-lg px-3 py-2 ${result.riskAssessment.hasFollowupPlan ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {result.riskAssessment.hasFollowupPlan ? "✓" : "△"} 复诊计划
              </div>
            </div>
            {result.riskAssessment.warnings.length > 0 && (
              <ul className="mt-3 space-y-1">
                {result.riskAssessment.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-orange-600 flex items-start gap-1">
                    <span className="mt-0.5">•</span> {w}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.followupScript && (
            <div className="border border-purple-200 bg-purple-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-purple-700 mb-2">复诊话术建议</h4>
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
