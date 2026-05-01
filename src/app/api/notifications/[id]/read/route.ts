import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ErrorCode,
  HttpError,
  handleRoute,
  requireAuth,
} from '@/lib/utils/api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/notifications/[id]/read — mark a notification as read.
 * The notification must belong to the calling user.
 */
export async function PUT(_req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      throw new HttpError(400, 'Invalid notification id', ErrorCode.VALIDATION_ERROR);
    }

    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { data: existing, error: fetchErr } = await supabase
      .from('notifications')
      .select('id, user_id, read_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      throw new HttpError(500, fetchErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!existing) {
      throw new HttpError(404, 'Notification not found', ErrorCode.NOT_FOUND);
    }
    if (existing.user_id !== profile.id) {
      throw new HttpError(403, 'You cannot modify this notification', ErrorCode.FORBIDDEN);
    }

    if (existing.read_at) {
      return { id: existing.id, read_at: existing.read_at };
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, read_at')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    return data;
  });
}
