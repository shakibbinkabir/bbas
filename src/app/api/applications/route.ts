import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, requireAuth, HttpError, ErrorCode } from '@/lib/utils/api';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import type { AppStatus } from '@/types';

const VALID_STATUSES: AppStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'information_requested',
  'corrections_submitted',
  'approved',
  'rejected',
  'withdrawn',
];

const SORT_FIELD_MAP: Record<string, string> = {
  submitted_at: 'submitted_at',
  updated_at: 'updated_at',
  created_at: 'created_at',
  status: 'status',
};

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status') ?? undefined;
    const sortByParam = url.searchParams.get('sortBy') ?? 'submitted_at';
    const sortOrderParam = (url.searchParams.get('sortOrder') ?? 'desc').toLowerCase();
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

    const sortColumn = SORT_FIELD_MAP[sortByParam] ?? 'submitted_at';
    const ascending = sortOrderParam === 'asc';

    let query = supabase
      .from('applications')
      .select('*, authority:authorities(id, code, name_en, name_bn)', { count: 'exact' });

    if (profile.role === 'owner') {
      query = query.eq('owner_id', profile.id);
    } else if (profile.role === 'officer') {
      if (!profile.authority_id) {
        throw new HttpError(403, 'Officer is not linked to an authority', ErrorCode.FORBIDDEN);
      }
      query = query.eq('authority_id', profile.authority_id);
    }

    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as AppStatus)) {
        throw new HttpError(400, 'Invalid status filter', ErrorCode.VALIDATION_ERROR);
      }
      query = query.eq('status', statusParam as AppStatus);
    }

    query = query
      .order(sortColumn, { ascending, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
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
