import { createClient } from '@supabase/supabase-js'

// 10-second timeout on every Supabase query. Without this the JS client has no
// built-in network timeout and a stalled connection (TCP hang, slow cold-start,
// intermittent DNS) will block the pipeline indefinitely.
const QUERY_TIMEOUT_MS = 10000

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (input, init) => {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)
          return fetch(input, { ...init, signal: controller.signal })
            .finally(() => clearTimeout(timer))
        },
      },
    }
  )
}
