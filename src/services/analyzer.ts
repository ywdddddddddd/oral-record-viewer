import { chat } from './deepseek'
import type { AnalysisResult } from '../types'

export async function analyzeCase(text: string): Promise<AnalysisResult> {
  const prompt = `请对以下口腔病历/处方进行专业合规性审查。从以下维度分析：

1. 完整性（0-100分）：是否包含主诉、现病史、既往史、口腔检查、辅助检查、诊断、治疗计划、当日处理、医嘱、知情同意等必要章节
2. 规范性（0-100分）：术语使用是否规范，诊断格式（牙位+疾病）是否正确，治疗描述是否完整
3. 风险评估：过敏史是否记录、全身疾病是否记录、手术风险因素、药物相互作用
4. 复诊话术建议：生成医生下次复诊时对患者说的话术参考（口语化、专业、易于沟通）

输出严格JSON格式：
{
  "completeness": { "score": 80, "missing": ["缺少过敏史记录", "缺少知情同意"], "issues": ["主诉未注明部位"] },
  "compliance": { "score": 85, "issues": ["诊断未注明牙位"] },
  "riskAssessment": { "hasAllergyRecord": false, "hasSystemicDisease": true, "warnings": ["未记录过敏史", "患者有高血压"] },
  "followupScript": "复诊话术：...",
  "summary": "总体评价一句话总结"
}

病历/处方内容：
${text.slice(0, 4000)}`

  const response = await chat([
    {
      role: 'system',
      content:
        '你是一位资深口腔医疗质量管理专家。对病历和处方进行合规性审查。必须严格输出JSON格式，评分要有依据。',
    },
    { role: 'user', content: prompt },
  ])

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    return JSON.parse(jsonMatch[0])
  } catch {
    return {
      completeness: { score: 0, missing: [], issues: ['AI 分析失败，请重试'] },
      compliance: { score: 0, issues: [] },
      riskAssessment: {
        hasAllergyRecord: false,
        hasSystemicDisease: false,
        warnings: [],
      },
      followupScript: '',
      summary: '分析失败',
    }
  }
}
