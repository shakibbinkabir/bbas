import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireAuth,
  requireRole,
  apiSuccess,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import type { AppStatus, BuildingType } from '@/types';

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

const VALID_BUILDING_TYPES: BuildingType[] = [
  'residential',
  'commercial',
  'industrial',
  'mixed',
  'institutional',
];

// Whitelist of sortable columns. Mapping protects against SQL injection
// from arbitrary `sortBy` values supplied by the client.
const SORT_FIELD_MAP: Record<string, string> = {
  application_number: 'application_number',
  submitted_at: 'submitted_at',
  updated_at: 'updated_at',
  created_at: 'created_at',
  status: 'status',
  current_stage: 'current_stage',
  ai_compliance_score: 'ai_compliance_score',
  building_type: 'building_type',
};

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status') ?? undefined;
    const stageParam = url.searchParams.get('stage') ?? undefined;
    const buildingTypeParam = url.searchParams.get('buildingType') ?? undefined;
    const dateFromParam = url.searchParams.get('dateFrom') ?? undefined;
    const dateToParam = url.searchParams.get('dateTo') ?? undefined;
    const searchParam = (url.searchParams.get('search') ?? '').trim();
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
      .select(
        '*, authority:authorities(id, code, name_en, name_bn), owner:user_profiles!applications_owner_id_fkey(id, full_name_en, full_name_bn, phone, email), assigned_officer:user_profiles!applications_assigned_officer_id_fkey(id, full_name_en, full_name_bn)',
        { count: 'exact' }
      );

    // Role scoping
    if (profile.role === 'owner') {
      query = query.eq('owner_id', profile.id);
    } else if (profile.role === 'officer') {
      if (!profile.authority_id) {
        throw new HttpError(403, 'Officer is not linked to an authority', ErrorCode.FORBIDDEN);
      }
      // Regular officer sees only what is assigned to them.
      query = query
        .eq('authority_id', profile.authority_id)
        .eq('assigned_officer_id', profile.id);
    } else if (profile.role === 'admin') {
      if (!profile.authority_id) {
        throw new HttpError(403, 'Admin is not linked to an authority', ErrorCode.FORBIDDEN);
      }
      // Admin sees all applications in their authority.
      query = query.eq('authority_id', profile.authority_id);
    }

    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as AppStatus)) {
        throw new HttpError(400, 'Invalid status filter', ErrorCode.VALIDATION_ERROR);
      }
      query = query.eq('status', statusParam as AppStatus);
    }

    if (stageParam) {
      const stageNum = Number.parseInt(stageParam, 10);
      if (!Number.isFinite(stageNum) || stageNum < 1 || stageNum > 9) {
        throw new HttpError(400, 'Invalid stage filter', ErrorCode.VALIDATION_ERROR);
      }
      query = query.eq('current_stage', stageNum);
    }

    if (buildingTypeParam) {
      if (!VALID_BUILDING_TYPES.includes(buildingTypeParam as BuildingType)) {
        throw new HttpError(400, 'Invalid building type filter', ErrorCode.VALIDATION_ERROR);
      }
      query = query.eq('building_type', buildingTypeParam as BuildingType);
    }

    if (dateFromParam) {
      query = query.gte('submitted_at', dateFromParam);
    }
    if (dateToParam) {
      query = query.lte('submitted_at', dateToParam);
    }

    if (searchParam) {
      // Strip PostgREST `or`-clause separators to keep the filter safe.
      const safe = searchParam.replace(/[%,()]/g, '');
      const pattern = `%${safe}%`;
      query = query.or(
        [
          `application_number.ilike.${pattern}`,
          `land_address_en.ilike.${pattern}`,
          `land_address_bn.ilike.${pattern}`,
          `project_name_en.ilike.${pattern}`,
          `project_name_bn.ilike.${pattern}`,
        ].join(',')
      );
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

/**
 * POST /api/applications — create a draft.
 *
 * The DB enforces NOT NULL on application_number, building_type, authority_id,
 * so we seed defaults the owner can later overwrite via PUT. The placeholder
 * application_number is replaced by generate_application_number() at submit.
 */
export async function POST() {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['owner']);

    // Pick the first active authority as a default — owner picks the real one in Step 2.
    const { data: defaultAuthority, error: authErr } = await supabase
      .from('authorities')
      .select('id')
      .eq('is_active', true)
      .order('code', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (authErr || !defaultAuthority) {
      throw new HttpError(500, 'No authorities configured', ErrorCode.INTERNAL_ERROR);
    }

    // Draft placeholder number — short, unique, replaced at submission time.
    const draftNumber = `DRAFT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from('applications')
      .insert({
        application_number: draftNumber,
        owner_id: profile.id,
        authority_id: defaultAuthority.id,
        building_type: 'residential',
        status: 'draft',
        current_stage: 1,
      })
      .select('id, status')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    return apiSuccess({ id: data.id, status: data.status }, 201);
  });
}
