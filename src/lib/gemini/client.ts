import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_TIMEOUT_MS = 30000

export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    const result = await model.generateContent(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { signal: controller.signal }
    )
    const text = result.response.text()
    if (!text) throw new Error('Empty response from Gemini')
    return text
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000}s`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
