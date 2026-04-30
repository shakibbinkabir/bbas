import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, requireAuth } from '@/lib/utils/api';

export async function GET() {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    return {
      user: profile,
      authority: profile.authority ?? null,
    };
  });
}
