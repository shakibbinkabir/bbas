import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import {
  ErrorCode,
  HttpError,
  handleRoute,
  requireAuth,
} from '@/lib/utils/api';

/**
 * GET /api/notifications — list notifications for the current user.
 * Query params: page (1+), limit (1–100).
 */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const url = new URL(req.url);
    const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
    const limitParam = Number.parseInt(
      url.searchParams.get('limit') ?? String(ITEMS_PER_PAGE),
      10
    );

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100
        ? limitParam
        : ITEMS_PER_PAGE;

    const { data, count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: data ?? [],
      total,
      page,
      pageSize: limit,
      totalPages,
    };
  });
}
