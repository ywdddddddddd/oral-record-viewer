import { chat } from './deepseek'
import type { CaseRecord, PlainSection } from '../types'

function buildTranslatePrompt(record: CaseRecord): string {
  const sectionsText = record.sections
    .map((s) => `【${s.title}】\n${s.content}`)
    .join('\n\n')

  return `请将以下专业口腔病历内容转换为患者能读懂的通俗报告。要求：

1. 每个章节都要通俗化，保留全部关键医学信息，但用日常语言表达
2. 对专业术语加通俗解释（如"根管治疗"→"清理牙齿内部感染神经的治疗"）
3. 输出格式必须是严格的 JSON，结构如下：
{
  "sections": [
    {
      "title": "章节标题",
      "plainContent": "通俗化后的内容"
    }
  ]
}

病历原文：
${sectionsText}`
}

export async function translateRecord(record: CaseRecord): Promise<PlainSection[]> {
  const prompt = buildTranslatePrompt(record)

  const response = await chat([
    {
      role: 'system',
      content:
        '你是一位专业的口腔医疗信息通俗化专家。你的任务是把专业病历转成患者能读懂的内容。必须严格输出JSON格式，不要输出任何JSON之外的内容。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    return parsed.sections.map(
      (s: { title: string; plainContent: string }, i: number) => ({
        id: `sec-${record.sections[i]?.title.replace(/\s+/g, '-') ?? i}`,
        title: s.title,
        plainContent: s.plainContent,
        originalContent: record.sections[i]?.content ?? '',
        isMarked: false,
      })
    )
  } catch {
    return record.sections.map((s) => ({
      id: `sec-${s.title.replace(/\s+/g, '-')}`,
      title: s.title,
      plainContent: `[通俗转换失败，以下是原文]\n${s.content}`,
      originalContent: s.content,
      isMarked: false,
    }))
  }
}

export async function reExplainSection(section: PlainSection): Promise<string> {
  const response = await chat([
    {
      role: 'system',
      content:
        '你是一位耐心的口腔医疗通俗化科普专家。患者不理解以下内容，请用更简单、更口语化的方式重新解释。可以使用比喻、类比。不超过200字。',
    },
    {
      role: 'user',
      content: `患者看不懂这段话（这是已经通俗化过的版本，但还不够简单）：\n\n【${section.title}】\n${section.plainContent}\n\n附原文：\n${section.originalContent}\n\n请用更简单的话重新解释：`,
    },
  ])

  return response.slice(0, 500)
}
