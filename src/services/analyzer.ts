import { chat } from './deepseek'
import type { AnalysisResult } from '../types'

function buildAuditPrompt(text: string): string {
  return `请依据《口腔病历书写基本规范》，对以下口腔病历进行逐项合规审核。

## 审核标准（按章节逐一检查）

### 一、一般资料
- 姓名、性别、年龄、民族 → 0/10分
- 药物过敏史（必须醒目）→ 0/20分（一票否决项）
- 联系方式（电话、地址）→ 0/5分
- 就诊日期（急症需精确到时分）→ 0/5分

### 二、主诉
- 以患者口吻一句话描述主要不适 → 0/30分
- 明确症状、部位、持续时间 → 0/30分
- 避免专业术语 → 0/20分
- 若有多个主诉，记录最主要者 → 0/20分

### 三、现病史
- 发病诱因、时间、起病缓急 → 0/15分
- 主要症状演变（性质/程度/缓解加重因素）→ 0/20分
- 伴随症状及相互关系 → 0/15分
- 诊治经过（院内外检查、诊断、用药、效果）→ 0/20分
- 一般情况（精神/睡眠/食欲/大小便）→ 0/20分
- 有鉴别意义的阴性症状 → 0/10分

### 四、既往史
- 药物过敏史（特别重要）→ 一票否决项
- 出血止血情况 → 0/20分
- 全身系统性疾病（心脑血管/免疫/糖尿病/高血压）→ 0/20分
- 传染病史（乙肝/艾滋/梅毒等）→ 0/20分
- 手术外伤输血史 → 0/20分
- 类固醇/抗凝剂/放疗史 → 0/10分
- 牙用材料过敏史 → 0/10分

### 五、个人史 & 婚育史
- 烟酒嗜好 → 0/40分
- 女性月经/婚育状况 → 0/60分

### 六、口腔专科检查
- 颌面部（对称/肿胀/瘘管/TMJ/开口度开口型）→ 0/15分
- 牙体检查（龋洞/缺损/探诊叩诊/冷热诊/电活力/松动度）→ 0/25分
- 牙周检查（牙龈/牙周袋/牙结石/松动度/BOP）→ 0/20分
- 咬合关系（覆合覆盖/Angle分类）→ 0/15分
- 牙列检查（牙弓形态/拥挤度/牙间隙）→ 0/10分
- 黏膜及涎腺 → 0/5分
- 牙位记录使用FDI或其他标准符号 → 0/10分

### 七、辅助检查
- X线片/全景/CBCT所见 → 0/40分
- 血常规/感染四项等化验 → 0/30分
- 外院检查注明机构及检查号 → 0/30分

### 八、诊断
- 主次诊断排列正确 → 0/40分
- 牙位标注规范（FDI符号）→ 0/30分
- 诊断格式（牙位+疾病名称）→ 0/30分

### 九、治疗计划
- 与诊断顺序对应 → 0/20分
- 分步治疗方案明确 → 0/30分
- 治疗风险及并发症说明 → 0/20分
- 备选方案说明 → 0/15分
- 费用告知 → 0/15分

### 十、知情同意
- 知情同意书签署 → 一票否决项
- 治疗风险/并发症/预后告知 → 0/50分
- 费用告知记录 → 0/50分

### 十一、治疗操作记录
- 术区消毒/麻醉方式及用量 → 0/20分
- 操作过程详述（去腐/开髓/预备/充填等）→ 0/25分
- 使用材料及器械 → 0/20分
- 术中情况（出血/疼痛/意外处理）→ 0/25分
- 操作时长 → 0/10分

### 十二、医嘱
- 术后饮食/口腔卫生要求 → 0/30分
- 用药指导（药名/剂量/频次/疗程）→ 0/30分
- 复诊时间 → 0/20分
- 禁忌及不适应急处理 → 0/20分

### 十三、签名与日期
- 接诊医师/操作医师/记录医师签名 → 0/60分
- 日期正确完整 → 0/40分

## 输出格式（严格JSON）
{
  "totalScore": 0-100,
  "completeness": { "score": 0-100, "missing": ["缺失项1..."], "issues": ["问题1..."] },
  "compliance": { "score": 0-100, "issues": ["规范问题1..."] },
  "riskAssessment": {
    "hasAllergyRecord": true/false,
    "hasSystemicDisease": true/false,
    "hasInfoboxConsent": true/false,
    "hasFollowupPlan": true/false,
    "warnings": ["风险1..."]
  },
  "sections": [
    { "section": "章节名", "status": "present/partial/missing", "score": 0-100, "issues": ["具体问题"] }
  ],
  "followupScript": "下次复诊话术建议（口语化、涵盖核心信息点）",
  "summary": "一句话总体评价"
}

病历内容：
${text.slice(0, 5000)}`
}

export async function analyzeCase(text: string): Promise<AnalysisResult> {
  const response = await chat(
    [
      {
        role: 'system',
        content:
          '你是一位资深口腔医疗质量管理专家，严格按照《病历书写基本规范》对口腔病历进行逐项审核。评分要客观、有依据，缺失项要具体指出。必须严格输出JSON格式。',
      },
      { role: 'user', content: buildAuditPrompt(text) },
    ],
    { maxTokens: 8192 }
  )

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`No JSON in response: ${response.slice(0, 200)}`)
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('[analyzer] parse error:', e instanceof Error ? e.message : String(e), 'response:', response.slice(0, 300))
    return {
      totalScore: 0,
      completeness: { score: 0, missing: [], issues: ['AI 分析失败，请重试'] },
      compliance: { score: 0, issues: [] },
      riskAssessment: {
        hasAllergyRecord: false,
        hasSystemicDisease: false,
        hasInfoboxConsent: false,
        hasFollowupPlan: false,
        warnings: [],
      },
      sections: [],
      followupScript: '',
      summary: '分析失败',
    }
  }
}
