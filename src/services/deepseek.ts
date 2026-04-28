import OpenAI from 'openai'

const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY

if (!apiKey) {
  console.warn('VITE_DEEPSEEK_API_KEY 未设置，AI 功能不可用')
}

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: apiKey ?? '',
  dangerouslyAllowBrowser: true,
})

export async function chat(messages: { role: 'system' | 'user'; content: string }[], opts?: { maxTokens?: number }): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'deepseek-v4-flash',
    messages,
    stream: false,
    max_tokens: opts?.maxTokens ?? 4096,
    temperature: 0.3,
  })
  return completion.choices[0].message.content ?? ''
}
