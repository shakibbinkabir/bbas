import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import {
  apiSuccess,
  ErrorCode,
  HttpError,
  handleRoute,
  requireRole,
} from '@/lib/utils/api';
import { bdPhoneRegex } from '@/lib/validators';
import { notifyOfficerWelcome } from '@/lib/notifications/triggers';

const createOfficerSchema = z.object({
  fullNameEn: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(255),
  fullNameBn: z.string().trim().min(3).max(255),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, 'Phone must be a valid Bangladesh number'),
});

const SORT_FIELD_MAP: Record<string, string> = {
  full_name_en: 'full_name_en',
  full_name_bn: 'full_name_bn',
  created_at: 'created_at',
  email: 'email',
};

/**
 * GET /api/users/officers — list officers + admins for the caller's authority,
 * along with the count of applications currently assigned to each.
 */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['admin']);

    if (!profile.authority_id) {
      throw new HttpError(
        403,
        'Admin is not linked to an authority',
        ErrorCode.FORBIDDEN
      );
    }

    const url = new URL(req.url);
    const search = (url.searchParams.get('search') ?? '').trim();
    const sortBy = url.searchParams.get('sortBy') ?? 'created_at';
    const sortOrder = (url.searchParams.get('sortOrder') ?? 'desc').toLowerCase();
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
    const sortColumn = SORT_FIELD_MAP[sortBy] ?? 'created_at';
    const ascending = sortOrder === 'asc';

    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('authority_id', profile.authority_id)
      .in('role', ['officer', 'admin']);

    if (search) {
      const safe = search.replace(/[%,()]/g, '');
      const pattern = `%${safe}%`;
      query = query.or(
        [
          `full_name_en.ilike.${pattern}`,
          `full_name_bn.ilike.${pattern}`,
          `email.ilike.${pattern}`,
        ].join(',')
      );
    }

    query = query
      .order(sortColumn, { ascending, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: officers, count, error } = await query;
    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    const officerIds = (officers ?? []).map((o) => o.id);
    const counts = new Map<string, number>();

    if (officerIds.length > 0) {
      // Fetch counts of currently-assigned (non-final-state) applications per officer.
      const { data: assignments, error: assignErr } = await supabase
        .from('applications')
        .select('assigned_officer_id')
        .in('assigned_officer_id', officerIds)
        .not('status', 'in', '(approved,rejected,withdrawn)');

      if (assignErr) {
        throw new HttpError(500, assignErr.message, ErrorCode.INTERNAL_ERROR);
      }

      for (const row of assignments ?? []) {
        if (row.assigned_officer_id) {
          counts.set(
            row.assigned_officer_id,
            (counts.get(row.assigned_officer_id) ?? 0) + 1
          );
        }
      }
    }

    const data = (officers ?? []).map((o) => ({
      ...o,
      assigned_count: counts.get(o.id) ?? 0,
    }));

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      total,
      page,
      pageSize: limit,
      totalPages,
    };
  });
}

/**
 * POST /api/users/officers — admin creates a new officer for their authority.
 * Creates a Supabase auth user (email-confirmed), inserts the user_profiles
 * row, and sends a welcome email.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['admin']);

    if (!profile.authority_id) {
      throw new HttpError(
        403,
        'Admin is not linked to an authority',
        ErrorCode.FORBIDDEN
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = createOfficerSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const admin = createAdminClient();

    // Reject duplicate email/phone collisions early so we don't orphan an auth user.
    const { data: existing } = await admin
      .from('user_profiles')
      .select('id, email, phone')
      .or(`email.eq.${parsed.data.email},phone.eq.${parsed.data.phone}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      throw new HttpError(
        409,
        'A user with this email or phone already exists',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      phone: parsed.data.phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        role: 'officer',
        full_name_en: parsed.data.fullNameEn,
        full_name_bn: parsed.data.fullNameBn,
      },
    });

    if (authErr || !created.user) {
      throw new HttpError(
        500,
        authErr?.message ?? 'Failed to create auth user',
        ErrorCode.INTERNAL_ERROR
      );
    }

    const newUserId = created.user.id;

    const { data: insertedProfile, error: insertErr } = await admin
      .from('user_profiles')
      .insert({
        id: newUserId,
        role: 'officer',
        full_name_en: parsed.data.fullNameEn,
        full_name_bn: parsed.data.fullNameBn,
        email: parsed.data.email,
        phone: parsed.data.phone,
        authority_id: profile.authority_id,
        is_active: true,
      })
      .select('*, authority:authorities(*)')
      .single();

    if (insertErr) {
      // Roll back the auth user so admins can retry with the same email.
      await admin.auth.admin.deleteUser(newUserId).catch(() => undefined);
      throw new HttpError(500, insertErr.message, ErrorCode.INTERNAL_ERROR);
    }

    const authorityName =
      insertedProfile.authority?.name_en ?? insertedProfile.authority?.name_bn ?? 'BBAS';

    // Fire-and-forget; sendNotification never throws.
    await notifyOfficerWelcome(newUserId, authorityName);

    return apiSuccess(insertedProfile, 201);
  });
}
