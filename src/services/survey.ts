import { chat } from './deepseek'
import type { Question, PlainSection } from '../types'

function buildSurveyPrompt(sections: PlainSection[]): string {
  const reportText = sections
    .map((s) => `【${s.title}】${s.plainContent}`)
    .join('\n\n')

  return `根据以下患者通俗版口腔健康报告，生成5道判断题（对/错），用于测试患者是否理解了自己的病情。要求：

1. 题目必须覆盖诊断、治疗、医嘱、注意事项等关键内容
2. 每道题两个选项："对"和"错"
3. 输出严格JSON格式：
{
  "questions": [
    {
      "text": "题目内容",
      "correctIndex": 0或1（0=对, 1=错）,
      "relatedSectionTitle": "关联的章节标题"
    }
  ]
}

患者报告：
${reportText}`
}

export async function generateQuestions(
  sections: PlainSection[]
): Promise<Question[]> {
  const prompt = buildSurveyPrompt(sections)

  try {
    const response = await chat([
      {
        role: 'system',
        content:
          '你是一位口腔医疗教育专家。根据患者报告生成理解测试题。必须严格输出JSON格式。',
      },
      { role: 'user', content: prompt },
    ])

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    return parsed.questions.map(
      (
        q: { text: string; correctIndex: number; relatedSectionTitle: string },
        i: number
      ) => {
        const related = sections.find((s) =>
          s.title.includes(q.relatedSectionTitle)
        )
        return {
          id: `q-${i}`,
          text: q.text,
          options: ['对', '错'],
          correctIndex: q.correctIndex,
          relatedSectionId: related?.id ?? sections[0]?.id ?? '',
          userAnswer: null,
          isCorrect: null,
        }
      }
    )
  } catch {
    return sections.slice(0, 5).map((s, i) => ({
      id: `q-fallback-${i}`,
      text: `你是否理解了「${s.title}」的内容？`,
      options: ['理解了', '没理解'],
      correctIndex: 0,
      relatedSectionId: s.id,
      userAnswer: null,
      isCorrect: null,
    }))
  }
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
          '你是一位口腔医疗教育专家。请根据以下已重新解释的通俗内容，生成一道新的判断题。必须严格输出JSON：{"text":"题目","correctIndex":0或1}。0=对，1=错。',
      },
      {
        role: 'user',
        content: `内容：【${section.title}】${baseText}`,
      },
    ])

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')

    const { text, correctIndex } = JSON.parse(jsonMatch[0])
    return {
      ...failedQuestion,
      text,
      correctIndex: correctIndex ?? 0,
      userAnswer: null,
      isCorrect: null,
    }
  } catch {
    return {
      ...failedQuestion,
      text: `重温一遍：你是否已经理解了「${section.title}」的新解释？`,
      userAnswer: null,
      isCorrect: null,
    }
  }
}
