import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireAuth,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { applicationId } = await params;
    if (!applicationId) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }

    // Confirm the user is allowed to view this application's history.
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, owner_id, authority_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (appErr) {
      throw new HttpError(500, appErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!app) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }
    if (profile.role === 'owner' && app.owner_id !== profile.id) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }
    if (
      (profile.role === 'officer' || profile.role === 'admin') &&
      profile.authority_id !== app.authority_id
    ) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }

    const { data, error } = await supabase
      .from('workflow_history')
      .select(
        'id, application_id, from_stage, to_stage, from_status, to_status, action, performed_by, comments, metadata, created_at, performed_by_profile:user_profiles!workflow_history_performed_by_fkey(id, full_name_en, full_name_bn, role)'
      )
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    return data ?? [];
  });
}
