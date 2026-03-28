import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Deletes all app data for the signed-in user, then deletes their Supabase Auth account.
 * Order: company row first (CASCADE to integrations, jobs, reports, agent_outputs), then auth user.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { error: companyError } = await admin
    .from('companies')
    .delete()
    .eq('supabase_user_id', user.id)

  if (companyError) {
    console.error('Delete company failed:', companyError)
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)

  if (deleteUserError) {
    console.error('Delete auth user failed:', deleteUserError)
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
