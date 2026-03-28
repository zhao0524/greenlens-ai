const BASE_URL = 'https://app.backboard.io/api'

async function call(endpoint: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.BACKBOARD_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`Backboard ${method} ${endpoint}: ${res.statusText}`)
  return res.json()
}

export const backboard = {
  createAssistant: (name: string, systemPrompt: string, model = 'claude-3-5-sonnet') =>
    call('/assistants', 'POST', { name, system_prompt: systemPrompt, llm_provider: 'anthropic', llm_model_name: model }),
  createThread: (assistantId: string) =>
    call('/threads', 'POST', { assistant_id: assistantId }),
  sendMessage: (threadId: string, content: string, memory: 'Auto' | 'Off' = 'Auto') =>
    call('/messages', 'POST', { thread_id: threadId, content, memory, stream: false })
}
