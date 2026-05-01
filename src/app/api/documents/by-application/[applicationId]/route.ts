import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireAuth,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';

/**
 * GET /api/documents/by-application/[applicationId]
 *
 * Returns every document attached to an application, ordered by document_type.
 * Accessible by the owner or any officer/admin in the same authority.
 * (Stage 4 Task 4.3)
 */
export async function GET(_req: NextRequest, ctx: { params: { applicationId: string } }) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, owner_id, authority_id')
      .eq('id', ctx.params.applicationId)
      .maybeSingle();

    if (appError) {
      throw new HttpError(500, appError.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!app) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }

    const isOwner = profile.role === 'owner' && app.owner_id === profile.id;
    const isOfficer =
      (profile.role === 'officer' || profile.role === 'admin') &&
      profile.authority_id === app.authority_id;

    if (!isOwner && !isOfficer) {
      throw new HttpError(403, 'Access denied', ErrorCode.FORBIDDEN);
    }

    const { data, error } = await supabase
      .from('application_documents')
      .select(
        'id, application_id, document_type, file_name, file_path, file_size_bytes, mime_type, upload_status, officer_remarks, ai_score, ai_findings, uploaded_at, updated_at'
      )
      .eq('application_id', ctx.params.applicationId)
      .order('document_type', { ascending: true })
      .order('uploaded_at', { ascending: true });

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    return data ?? [];
  });
}
