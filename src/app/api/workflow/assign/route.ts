import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireRole,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import { WorkflowEngine } from '@/lib/workflow/engine';
import { unwrap } from '@/lib/workflow/route-helpers';
import { notifyApplicationAssigned } from '@/lib/notifications/triggers';

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['admin']);

    const body = await req.json().catch(() => ({}));
    const applicationId = body?.applicationId as string | undefined;
    const officerId = body?.officerId as string | undefined;

    if (!applicationId || !officerId) {
      throw new HttpError(
        400,
        'applicationId and officerId are required',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const engine = new WorkflowEngine(supabase);
    const result = unwrap(
      await engine.assign({
        applicationId,
        officerId,
        performedBy: profile.id,
        performerRole: profile.role,
      })
    );

    const app = result.application!;
    if (app.application_number) {
      void notifyApplicationAssigned(officerId, app.id, app.application_number);
    }

    return app;
  });
}

// GET /api/workflow/assign?authorityId=...
// Lists officers eligible for assignment within the admin's authority.
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['admin']);

    const url = new URL(req.url);
    const authorityIdParam = url.searchParams.get('authorityId') ?? profile.authority_id;
    if (!authorityIdParam) {
      throw new HttpError(400, 'authorityId is required', ErrorCode.VALIDATION_ERROR);
    }
    if (authorityIdParam !== profile.authority_id) {
      throw new HttpError(403, 'Cross-authority access denied', ErrorCode.FORBIDDEN);
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name_en, full_name_bn, role, email')
      .eq('authority_id', authorityIdParam)
      .in('role', ['officer', 'admin'])
      .eq('is_active', true)
      .order('full_name_en', { ascending: true });

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    return data ?? [];
  });
}
