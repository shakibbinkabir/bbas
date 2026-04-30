import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, apiSuccess } from '@/lib/utils/api';

export async function POST() {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return apiSuccess({ ok: true });
  });
}
