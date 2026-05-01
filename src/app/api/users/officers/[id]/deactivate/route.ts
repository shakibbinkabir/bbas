import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ErrorCode,
  HttpError,
  handleRoute,
  requireRole,
} from '@/lib/utils/api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/users/officers/[id]/deactivate — toggles `is_active` on the
 * officer profile. When deactivating, also bans the auth user so they cannot
 * log in. When reactivating, the ban is lifted.
 */
export async function PUT(_req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      throw new HttpError(400, 'Invalid officer id', ErrorCode.VALIDATION_ERROR);
    }

    const supabase = await createServerSupabaseClient();
    const { profile: admin } = await requireRole(supabase, ['admin']);

    if (!admin.authority_id) {
      throw new HttpError(
        403,
        'Admin is not linked to an authority',
        ErrorCode.FORBIDDEN
      );
    }
    if (admin.id === id) {
      throw new HttpError(
        400,
        'You cannot deactivate your own account',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const adminClient = createAdminClient();

    const { data: target, error: fetchErr } = await adminClient
      .from('user_profiles')
      .select('id, role, authority_id, is_active')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      throw new HttpError(500, fetchErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!target) {
      throw new HttpError(404, 'Officer not found', ErrorCode.NOT_FOUND);
    }
    if (target.authority_id !== admin.authority_id) {
      throw new HttpError(
        403,
        'You can only manage officers in your authority',
        ErrorCode.FORBIDDEN
      );
    }
    if (target.role !== 'officer' && target.role !== 'admin') {
      throw new HttpError(
        400,
        'Only officer or admin profiles can be deactivated here',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const nextActive = !target.is_active;

    const { data, error } = await adminClient
      .from('user_profiles')
      .update({ is_active: nextActive })
      .eq('id', id)
      .select('*, authority:authorities(*)')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    // Mirror the active flag onto Supabase Auth so a deactivated officer
    // cannot log in even if a session is still cached client-side.
    // ban_duration: '876000h' is ~100 years; 'none' lifts the ban.
    await adminClient.auth.admin
      .updateUserById(id, {
        ban_duration: nextActive ? 'none' : '876000h',
      })
      .catch((err) => {
        console.error('[officers] failed to toggle auth ban', err);
      });

    return data;
  });
}
