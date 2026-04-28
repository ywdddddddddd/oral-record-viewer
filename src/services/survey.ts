import { chat } from './deepseek'
import type { Question, PlainSection } from '../types'

function buildPatientSurveyPrompt(sections: PlainSection[]): string {
  const reportText = sections
    .map((s) => `【${s.title}】${s.plainContent}`)
    .join('\n\n')

  return `根据以下患者口腔健康通俗报告，生成5道判断题（选项：「对」「错」）。题目必须覆盖患者最需要理解的核心信息：

1. 诊断相关（我的牙齿/口腔出了什么问题？）
2. 治疗相关（医生今天做了什么？）
3. 居家护理（回家后我要注意什么？）
4. 复诊时间（下次什么时候来？）
5. 警示信号（什么情况下要立即就医？）

要求：
- 题目用第二人称（"您"），语气温和
- 正确答案基于报告内容
- 输出严格JSON：{"questions":[{"text":"题目","correctIndex":0或1(0=对,1=错)}]}

报告内容：
${reportText}`
}

export async function generateQuestions(
  sections: PlainSection[]
): Promise<Question[]> {
  try {
    const response = await chat([
      {
        role: 'system',
        content:
          '你是一位口腔医疗教育专家。根据患者报告生成5道通俗理解测试题。必须严格输出JSON格式。',
      },
      { role: 'user', content: buildPatientSurveyPrompt(sections) },
    ])

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')

    const parsed = JSON.parse(jsonMatch[0])
    return parsed.questions.map(
      (q: { text: string; correctIndex: number }, i: number) => ({
        id: `q-${i}`,
        text: q.text,
        options: ['对', '错'],
        correctIndex: q.correctIndex,
        relatedSectionId: sections[0]?.id ?? '',
        userAnswer: null,
        isCorrect: null,
      })
    )
  } catch {
    return fallbackQuestions(sections)
  }
}

function fallbackQuestions(_sections: PlainSection[]): Question[] {
  const sid = _sections[0]?.id ?? ''
  return [
    { id: 'q-0', text: '您已经了解了自己的口腔检查结果和诊断', options: ['对', '错'], correctIndex: 0, relatedSectionId: sid, userAnswer: null, isCorrect: null },
    { id: 'q-1', text: '您清楚医生今天为您做了哪些治疗或操作', options: ['对', '错'], correctIndex: 0, relatedSectionId: sid, userAnswer: null, isCorrect: null },
    { id: 'q-2', text: '您知道回家后需要注意的事项（饮食、刷牙、用药等）', options: ['对', '错'], correctIndex: 0, relatedSectionId: sid, userAnswer: null, isCorrect: null },
    { id: 'q-3', text: '您记住了下次复诊的时间或条件', options: ['对', '错'], correctIndex: 0, relatedSectionId: sid, userAnswer: null, isCorrect: null },
    { id: 'q-4', text: '您知道什么情况下需要立即联系医生', options: ['对', '错'], correctIndex: 0, relatedSectionId: sid, userAnswer: null, isCorrect: null },
  ]
}

export async function regenerateQuestion(
  failedQuestion: Question,
  section: PlainSection
): Promise<Question> {
  const baseText = section.reExplanation ?? section.plainContent
  try {
    const response = await chat([
      {
        role: 'system',
        content:
          '生成一道新的判断题，帮助患者理解核心信息。严格输出JSON：{"text":"题目","correctIndex":0或1}。',
      },
      { role: 'user', content: `内容：【${section.title}】${baseText}` },
    ])
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const { text, correctIndex } = JSON.parse(jsonMatch[0])
    return { ...failedQuestion, text, correctIndex: correctIndex ?? 0, userAnswer: null, isCorrect: null }
  } catch {
    return { ...failedQuestion, text: `重温一遍：您是否理解了「${section.title}」？`, userAnswer: null, isCorrect: null }
  }
}
