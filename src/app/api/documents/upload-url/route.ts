import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, requireAuth, HttpError, ErrorCode } from '@/lib/utils/api';
import { documentUploadSchema } from '@/lib/validators';
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_APPLICATION,
} from '@/lib/constants';
import { sanitizeFileName } from '@/lib/documents/validation';

/**
 * POST /api/documents/upload-url
 *
 * Issues a 5-minute Supabase signed upload URL for a document attached to an
 * application owned by the current user. (PRD Section 11.2 / Stage 4 Task 4.1)
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const body = await req.json().catch(() => null);
    const parsed = documentUploadSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }
    const { applicationId, documentType, fileName, fileSize, mimeType } = parsed.data;

    if (!(ACCEPTED_FILE_TYPES as readonly string[]).includes(mimeType)) {
      throw new HttpError(400, 'Unsupported file type', ErrorCode.VALIDATION_ERROR);
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new HttpError(
        400,
        `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, status, authority:authorities(code)')
      .eq('id', applicationId)
      .eq('owner_id', profile.id)
      .maybeSingle();

    if (appError) {
      throw new HttpError(500, appError.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!app) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }
    if (app.status !== 'draft' && app.status !== 'information_requested') {
      throw new HttpError(
        403,
        'Documents can only be uploaded while the application is a draft or has been returned for corrections',
        ErrorCode.FORBIDDEN
      );
    }

    const { count, error: countError } = await supabase
      .from('application_documents')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', applicationId);
    if (countError) {
      throw new HttpError(500, countError.message, ErrorCode.INTERNAL_ERROR);
    }
    if ((count ?? 0) >= MAX_FILES_PER_APPLICATION) {
      throw new HttpError(
        400,
        `An application may have at most ${MAX_FILES_PER_APPLICATION} documents`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const authority = Array.isArray(app.authority) ? app.authority[0] : app.authority;
    const authorityCode = authority?.code;
    if (!authorityCode) {
      throw new HttpError(500, 'Application is missing an authority', ErrorCode.INTERNAL_ERROR);
    }

    const safeName = sanitizeFileName(fileName);
    const path = `${authorityCode}/${applicationId}/${documentType}/${Date.now()}_${safeName}`;

    const { data, error } = await supabase.storage
      .from('application-documents')
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new HttpError(
        500,
        error?.message ?? 'Failed to create signed upload URL',
        ErrorCode.STORAGE_ERROR
      );
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path,
    };
  });
}
