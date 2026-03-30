import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  type GoogleUsageSpikeRouteSupabase,
  isGoogleUsageSpikeRouteEnabled,
  loadGoogleUsageSpikeRoutePayload,
} from '@/lib/reports/google-usage-spike'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isGoogleUsageSpikeRouteEnabled()) {
    return NextResponse.json(
      {
        error: 'Google usage spike route is disabled. Use dev or ENABLE_GOOGLE_USAGE_SPIKE=true.',
      },
      { status: 404 }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  try {
    const result = await loadGoogleUsageSpikeRoutePayload(
      supabase as unknown as GoogleUsageSpikeRouteSupabase,
      id
    )

    if (result.kind === 'unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (result.kind === 'company_not_found') {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Google usage spike not found' }, { status: 404 })
    }

    return NextResponse.json(result.payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Google usage spike failure'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
