import { useState, useEffect } from 'react'
import type { Question } from '../types'

interface Props {
  questions: Question[]
  questionsLoading: boolean
  onReloadQuestions: () => void
  onAllPassed: () => void
  onComplete?: (answers: number[]) => void
}

export default function PatientSurvey({ questions, questionsLoading, onReloadQuestions, onAllPassed, onComplete }: Props) {
  const [answers, setAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setAnswers(new Array(questions.length).fill(-1))
    setSubmitted(false)
  }, [questions])

  const allAnswered = answers.length > 0 && answers.every((a) => a !== -1)
  const results = submitted
    ? questions.map((q, i) => ({
        ...q,
        userAnswer: answers[i],
        isCorrect: answers[i] === q.correctIndex,
      }))
    : []

  const allCorrect = submitted && results.every((r) => r.isCorrect)
  const wrongCount = submitted ? results.filter((r) => !r.isCorrect).length : 0

  useEffect(() => {
    if (submitted && allCorrect && onComplete) {
      onComplete(answers)
    }
  }, [submitted, allCorrect])

  function handleAnswer(qIndex: number, optionIndex: number) {
    if (submitted) return
    const next = [...answers]
    next[qIndex] = optionIndex
    setAnswers(next)
  }

  if (questionsLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4 animate-pulse">📝</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">正在生成问卷…</h2>
        <p className="text-sm text-slate-500">AI 正在根据您的报告生成理解确认题</p>
      </div>
    )
  }

  if (submitted && allCorrect) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-green-600 mb-2">恭喜！全部答对</h2>
        <p className="text-slate-500">
          您已充分理解了诊断、治疗方案和医嘱。通知闭环已完成。
        </p>
        <div className="mt-6">
          <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            闭环率 100% · 第 1 次尝试通过
          </span>
        </div>
        <div className="mt-6">
          <button
            onClick={onAllPassed}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 cursor-pointer transition-all"
          >
            查看闭环看板
          </button>
        </div>
      </div>
    )
  }

  if (submitted && !allCorrect) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📋</span>
          <h2 className="text-xl font-bold text-slate-800">确认问卷结果</h2>
        </div>

        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 mb-6">
          <p className="font-semibold text-orange-700 mb-1">
            答错 {wrongCount} 题 — 以下内容需要加强理解：
          </p>
          <p className="text-sm text-orange-600">
            请返回报告页面，标记您觉得难以理解的部分，AI 将为您重新解释后再次测试。
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {results.map((r, i) => (
            <div
              key={questions[i].id}
              className={`border rounded-xl p-4 ${
                r.isCorrect
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{r.isCorrect ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-800">
                    {i + 1}. {r.text}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    你的答案：{questions[i].options[answers[i]]}
                    {' — '}
                    正确答案：{questions[i].options[questions[i].correctIndex]}
                  </p>
                  {!r.isCorrect && (
                    <p className="text-xs text-red-500 mt-1">
                      关联章节：{r.relatedSectionId.replace('sec-', '').replace(/-/g, ' ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-right space-x-3">
          <button
            onClick={onReloadQuestions}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 cursor-pointer transition-all"
          >
            重新生成问卷，再来一次
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">✅</span>
        <div>
          <h2 className="text-xl font-bold text-slate-800">理解确认问卷</h2>
          <p className="text-sm text-slate-500">请根据报告内容回答以下问题</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        {questions.map((q, qi) => (
          <div key={q.id} className="border border-slate-200 rounded-xl p-4 bg-white">
            <p className="font-medium text-slate-800 mb-3">
              {qi + 1}. {q.text}
            </p>
            <div className="flex gap-3">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => handleAnswer(qi, oi)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer
                    ${answers[qi] === oi
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-right">
        <button
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
          className="px-6 py-2.5 rounded-lg font-medium text-white transition-all
            bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
        >
          提交确认
        </button>
      </div>
    </div>
  )
}
