import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  handleRoute,
  requireAuth,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import type { DocumentType } from '@/types';

const DOCUMENT_TYPE_VALUES = [
  'land_deed',
  'khatian_certificate',
  'mutation_certificate',
  'tax_clearance',
  'architectural_plan',
  'structural_plan',
  'soil_test_report',
  'eia_report',
  'fire_noc',
  'applicant_nid',
  'owner_photo',
  'site_photo',
  'other',
] as const satisfies readonly DocumentType[];

const registerSchema = z.object({
  applicationId: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPE_VALUES),
  fileName: z.string().trim().min(1).max(255),
  filePath: z.string().trim().min(1).max(2000),
  fileSize: z.coerce.number().int().positive().max(MAX_FILE_SIZE),
  mimeType: z.enum(ACCEPTED_FILE_TYPES),
});

/**
 * POST /api/documents/register
 *
 * Called by the client immediately after a successful direct upload to
 * Supabase Storage. Verifies the file landed at the expected path and inserts
 * a row in `application_documents`. (PRD Section 11.2 / Stage 4 Task 4.2)
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }
    const { applicationId, documentType, fileName, filePath, fileSize, mimeType } = parsed.data;

    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, status')
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
        'Documents can only be registered while the application is editable',
        ErrorCode.FORBIDDEN
      );
    }

    const segments = filePath.split('/');
    if (segments.length < 4 || segments[1] !== applicationId || segments[2] !== documentType) {
      throw new HttpError(
        400,
        'File path does not match application/document type',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const dirPath = segments.slice(0, -1).join('/');
    const storedFileName = segments[segments.length - 1];

    const { data: listing, error: listError } = await supabase.storage
      .from('application-documents')
      .list(dirPath, { limit: 100, search: storedFileName });

    if (listError) {
      throw new HttpError(500, listError.message, ErrorCode.STORAGE_ERROR);
    }
    const exists = (listing ?? []).some((entry) => entry.name === storedFileName);
    if (!exists) {
      throw new HttpError(
        400,
        'Uploaded file was not found in storage',
        ErrorCode.STORAGE_ERROR
      );
    }

    const { data: doc, error } = await supabase
      .from('application_documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_name: fileName,
        file_path: filePath,
        file_size_bytes: fileSize,
        mime_type: mimeType,
        upload_status: 'uploaded',
      })
      .select('*')
      .single();

    if (error || !doc) {
      throw new HttpError(
        500,
        error?.message ?? 'Failed to register document',
        ErrorCode.INTERNAL_ERROR
      );
    }

    return apiSuccess(doc, 201);
  });
}
