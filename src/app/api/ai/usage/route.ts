import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, requireRole, HttpError, ErrorCode } from '@/lib/utils/api';
import { currentRequestCount, DEFAULT_LIMIT_PER_MINUTE } from '@/lib/gemini/rate-limiter';

const DAILY_TOKEN_LIMIT = 1_000_000;

export async function GET() {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    await requireRole(supabase, ['admin']);

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('ai_scoring_results')
      .select('tokens_used')
      .gte('scored_at', startOfDay.toISOString());

    if (error) throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);

    const requestCount = data?.length ?? 0;
    const tokensUsed = (data ?? []).reduce((acc, row) => acc + (row.tokens_used ?? 0), 0);

    return {
      date: startOfDay.toISOString().slice(0, 10),
      requestCount,
      tokensUsed,
      dailyLimit: DAILY_TOKEN_LIMIT,
      requestsPerMinute: {
        current: currentRequestCount(),
        limit: DEFAULT_LIMIT_PER_MINUTE,
      },
    };
  });
}
