import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  handleRoute,
  requireAuth,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';

/**
 * GET /api/documents/[id]
 *
 * Returns metadata for a single document. Accessible by the owner of the
 * parent application or any officer/admin in the same authority.
 * (Stage 4 Task 4.3)
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { data: doc, error } = await supabase
      .from('application_documents')
      .select('*, application:applications(id, owner_id, authority_id)')
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

    const { application: _application, ...meta } = doc as typeof doc & { application: unknown };
    return meta;
  });
}

/**
 * DELETE /api/documents/[id]
 *
 * Removes the document from Supabase Storage and the `application_documents`
 * table. Owner-only and only when the parent application is editable.
 * (Stage 4 Task 4.3)
 */
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { data: doc, error } = await supabase
      .from('application_documents')
      .select('id, file_path, application:applications(id, owner_id, status)')
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
    if (app.owner_id !== profile.id) {
      throw new HttpError(403, 'Only the owner can delete documents', ErrorCode.FORBIDDEN);
    }
    if (app.status !== 'draft' && app.status !== 'information_requested') {
      throw new HttpError(
        403,
        'Documents can only be removed while the application is editable',
        ErrorCode.FORBIDDEN
      );
    }

    const { error: storageError } = await supabase.storage
      .from('application-documents')
      .remove([doc.file_path]);
    if (storageError) {
      throw new HttpError(500, storageError.message, ErrorCode.STORAGE_ERROR);
    }

    const { error: deleteError } = await supabase
      .from('application_documents')
      .delete()
      .eq('id', ctx.params.id);
    if (deleteError) {
      throw new HttpError(500, deleteError.message, ErrorCode.INTERNAL_ERROR);
    }

    return new NextResponse(null, { status: 204 });
  });
}
