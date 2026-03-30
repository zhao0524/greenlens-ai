import { NextResponse } from 'next/server'
import { backboard } from '@/lib/backboard/client'

function isTestRouteEnabled() {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.ENABLE_BACKBOARD_TEST_ROUTE === 'true'
  )
}

/**
 * POST — minimal Backboard round-trip for debugging (assistant → thread → message).
 * Enable with dev server, or set ENABLE_BACKBOARD_TEST_ROUTE=true (e.g. preview deploys).
 */
export async function POST() {
  if (!isTestRouteEnabled()) {
    return NextResponse.json(
      { error: 'Backboard test route is disabled. Use dev or ENABLE_BACKBOARD_TEST_ROUTE=true.' },
      { status: 404 }
    )
  }
  if (!process.env.BACKBOARD_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'BACKBOARD_API_KEY is missing in environment.' },
      { status: 500 }
    )
  }

  try {
    const assistant = await backboard.createAssistant(
      'GreenLens API smoke test',
      'Reply in one short friendly sentence. No markdown.',
      'claude-3-5-sonnet'
    )
    const assistantId = (assistant as { assistant_id?: string; id?: string }).assistant_id
      ?? (assistant as { id?: string }).id
    if (!assistantId) {
      return NextResponse.json({ ok: false, error: 'No assistant id in createAssistant response', raw: assistant }, { status: 502 })
    }

    const thread = await backboard.createThread(assistantId)
    const threadId = (thread as { thread_id?: string; id?: string }).thread_id
      ?? (thread as { id?: string }).id
    if (!threadId) {
      return NextResponse.json({ ok: false, error: 'No thread id in createThread response', raw: thread }, { status: 502 })
    }

    const response = await backboard.sendMessage(
      threadId,
      'Say hello and confirm the Backboard API connection works.'
    )
    const text =
      (response as { content?: string; message?: string; text?: string }).content
      ?? (response as { message?: string }).message
      ?? (response as { text?: string }).text
      ?? ''

    return NextResponse.json({
      ok: true,
      assistantId,
      threadId,
      assistantText: text,
      raw: response,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
