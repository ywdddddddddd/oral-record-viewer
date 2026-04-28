import { useEffect, useState } from 'react'

interface Props {
  isTranslating: boolean
  progress: number
  error: string | null
}

export default function AiTranslate({ isTranslating, progress, error }: Props) {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    if (!isTranslating) return
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [isTranslating])

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-600 mb-2">转换失败</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    )
  }

  if (!isTranslating && progress === 100) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-600 mb-2">转换完成</h2>
        <p className="text-slate-500">AI 已将专业病历转换为通俗报告</p>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4 animate-pulse">🤖</div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">
        AI 正在转换中{'.'.repeat(dots)}
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        正在将专业口腔病历转换为通俗易懂的患者报告…
      </p>

      <div className="max-w-md mx-auto">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{progress}%</p>
      </div>

      <div className="mt-6 text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
        <p className="animate-pulse">
          {progress < 30 && '分析病历结构…'}
          {progress >= 30 && progress < 60 && '匹配专业术语…'}
          {progress >= 60 && progress < 85 && '生成通俗解释…'}
          {progress >= 85 && '整理最终报告…'}
        </p>
      </div>
    </div>
  )
}
