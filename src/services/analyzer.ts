import { chat } from './deepseek'
import type { AnalysisResult } from '../types'

function buildAuditPrompt(text: string): string {
  return `你是口腔病历质控专家。按以下13个章节逐项审核病历，每项给出 status（present/partial/missing）、0-100分、具体问题。

审核标准：
1. 一般资料：姓名、性别、年龄、过敏史（一票否决）、联系方式、就诊日期
2. 主诉：患者口吻、症状+部位+时间、避免术语
3. 现病史：诱因、演变、伴随症状、诊治经过、阴性症状
4. 既往史：过敏、出血、全身疾病、传染病、手术外伤、放射史、材料过敏
5. 个人/婚育史：烟酒嗜好、女性月经/婚育
6. 口腔检查：颌面TMJ、牙体牙髓、牙周、咬合、牙列、黏膜、牙位符号
7. 辅助检查：X线/CBCT所见、化验、外院检查注明
8. 诊断：主次排列、牙位标注(FDI)、诊断格式
9. 治疗计划：分步方案、风险告知、备选方案、费用
10. 知情同意：签署记录、风险告知、费用告知
11. 治疗记录：麻醉、操作过程、材料器械、术中情况
12. 医嘱：术后指导、用药、复诊时间、禁忌
13. 签名：医师签名、日期

输出纯JSON（不要markdown代码块）：
{"totalScore":85,"completeness":{"score":80,"missing":["缺少过敏史"],"issues":["主诉未标注部位"]},"compliance":{"score":90,"issues":["诊断未用FDI符号"]},"riskAssessment":{"hasAllergyRecord":false,"hasSystemicDisease":true,"hasInfoboxConsent":false,"hasFollowupPlan":true,"warnings":["未记录过敏史"]},"sections":[{"section":"一般资料","status":"partial","score":60,"issues":["缺少过敏史"]}],"followupScript":"复诊话术","summary":"总体评价"}

病历内容：${text.slice(0, 4000)}`
}

export async function analyzeCase(text: string): Promise<AnalysisResult> {
  const response = await chat(
    [
      {
        role: 'system',
        content: '口腔病历质控专家。严格审核，输出纯JSON。评分客观有据。',
      },
      { role: 'user', content: buildAuditPrompt(text) },
    ],
    { maxTokens: 16384 }
  )

  try {
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`No JSON, got: ${cleaned.slice(0, 200)}`)
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('[analyzer] parse error:', e instanceof Error ? e.message : String(e))
    console.error('[analyzer] raw response:', response.slice(0, 500))
    return {
      totalScore: 0,
      completeness: { score: 0, missing: [], issues: [`分析失败: ${e instanceof Error ? e.message.slice(0, 100) : '未知'}`] },
      compliance: { score: 0, issues: [] },
      riskAssessment: { hasAllergyRecord: false, hasSystemicDisease: false, hasInfoboxConsent: false, hasFollowupPlan: false, warnings: [] },
      sections: [],
      followupScript: '',
      summary: '',
    }
  }
}
