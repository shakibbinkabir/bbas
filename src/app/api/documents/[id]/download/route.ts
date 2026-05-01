import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireAuth,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * GET /api/documents/[id]/download
 *
 * Returns a 1-hour signed download URL for a document. Accessible by the owner
 * of the parent application or any officer/admin in the same authority.
 * (PRD Section 11.4 / Stage 4 Task 4.4)
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { data: doc, error } = await supabase
      .from('application_documents')
      .select('id, file_path, file_name, application:applications(owner_id, authority_id)')
      .eq('id', ctx.params.id)
      .maybeSingle();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!doc) {
      throw new HttpError(404, 'Document not found', ErrorCode.NOT_FOUND);
    }

    const app = Array.isArray(doc.application) ? doc.application[0] : doc.application;
    if (!app) {
      throw new HttpError(404, 'Document not found', ErrorCode.NOT_FOUND);
    }

    const isOwner = profile.role === 'owner' && app.owner_id === profile.id;
    const isOfficer =
      (profile.role === 'officer' || profile.role === 'admin') &&
      profile.authority_id === app.authority_id;

    if (!isOwner && !isOfficer) {
      throw new HttpError(403, 'Access denied', ErrorCode.FORBIDDEN);
    }

    // No `download` option — clients use the same URL for inline preview
    // (images in a modal, PDFs in a new tab) as well as direct download.
    const { data: signed, error: signError } = await supabase.storage
      .from('application-documents')
      .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY_SECONDS);

    if (signError || !signed) {
      throw new HttpError(
        500,
        signError?.message ?? 'Failed to create signed download URL',
        ErrorCode.STORAGE_ERROR
      );
    }

    return {
      downloadUrl: signed.signedUrl,
      fileName: doc.file_name,
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    };
  });
}
