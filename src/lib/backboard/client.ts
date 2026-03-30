// Backboard.io REST API client
// Base URL: https://app.backboard.io/api
// Auth: X-API-Key header
// Docs: https://docs.backboard.io

const BASE_URL = 'https://app.backboard.io/api'
const BACKBOARD_TIMEOUT_MS = 120000

function headers(json = true) {
  const h: Record<string, string> = {
    'X-API-Key': process.env.BACKBOARD_API_KEY ?? ''
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKBOARD_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Backboard request timed out after ${BACKBOARD_TIMEOUT_MS / 1000}s`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function jsonRequest(endpoint: string, method = 'GET', body?: unknown) {
  const res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
    method,
    headers: headers(true),
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Backboard ${method} ${endpoint} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function formRequest(endpoint: string, data: Record<string, string>) {
  const res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: headers(false),
    body: new URLSearchParams(data)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Backboard POST ${endpoint} → ${res.status}: ${text}`)
  }
  return res.json()
}

export const backboard = {
  // POST /assistants → { assistant_id, ... }
  createAssistant: (name: string, systemPrompt: string, model = 'claude-3-5-sonnet') =>
    jsonRequest('/assistants', 'POST', {
      name,
      system_prompt: systemPrompt,
      llm_provider: 'anthropic',
      llm_model_name: model
    }),

  // POST /assistants/{assistant_id}/threads → { thread_id, ... }
  createThread: (assistantId: string) =>
    jsonRequest(`/assistants/${assistantId}/threads`, 'POST'),

  // POST /threads/{thread_id}/messages (form-encoded) → { content: string, ... }
  sendMessage: (threadId: string, content: string, memory: 'Auto' | 'Off' = 'Auto') =>
    formRequest(`/threads/${threadId}/messages`, {
      content,
      stream: 'false',
      memory
    })
}

// Fallback output used when Backboard is unavailable or returns an error.
export const FALLBACK_TRANSLATOR_OUTPUT = {
  decisions: [],
  incentivesAndBenefits: [],
  mitigationStrategies: [],
  hypeCycleContext: '',
  executiveNarrative: 'Analysis complete. Connect Backboard to generate executive narrative and strategic recommendations.',
  esgDisclosureText: 'AI environmental data available in detailed report sections. Enable the strategic analysis integration to generate a full disclosure statement.'
}
