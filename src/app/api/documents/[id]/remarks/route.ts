import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireRole,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import type { UploadStatus } from '@/types';

const VALID_STATUSES: UploadStatus[] = ['verified', 'rejected'];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    await requireRole(supabase, ['officer', 'admin']);

    const { id } = await params;
    if (!id) {
      throw new HttpError(400, 'Document id is required', ErrorCode.VALIDATION_ERROR);
    }

    const body = await req.json().catch(() => ({}));
    const remarks = (body?.remarks as string | undefined) ?? '';
    const status = body?.status as UploadStatus | undefined;

    if (status && !VALID_STATUSES.includes(status)) {
      throw new HttpError(400, 'Invalid status', ErrorCode.VALIDATION_ERROR);
    }

    const updates: { officer_remarks: string; upload_status?: UploadStatus } = {
      officer_remarks: remarks,
    };
    if (status) updates.upload_status = status;

    const { data, error } = await supabase
      .from('application_documents')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    return data;
  });
}
