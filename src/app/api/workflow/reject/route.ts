import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireRole,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import { MIN_COMMENT_LENGTH, WorkflowEngine } from '@/lib/workflow/engine';
import { unwrap } from '@/lib/workflow/route-helpers';
import { notifyApplicationRejected } from '@/lib/notifications/triggers';

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['officer', 'admin']);

    const body = await req.json().catch(() => ({}));
    const applicationId = body?.applicationId as string | undefined;
    const reason = ((body?.reason as string | undefined) ?? '').trim();

    if (!applicationId) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }
    if (!reason) {
      throw new HttpError(400, 'Rejection reason is required', ErrorCode.VALIDATION_ERROR);
    }
    if (reason.length < MIN_COMMENT_LENGTH) {
      throw new HttpError(
        400,
        `Rejection reason must be at least ${MIN_COMMENT_LENGTH} characters`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const engine = new WorkflowEngine(supabase);
    const result = unwrap(
      await engine.reject({
        applicationId,
        performedBy: profile.id,
        performerRole: profile.role,
        reason,
      })
    );

    const app = result.application!;
    if (app.application_number) {
      void notifyApplicationRejected(
        app.id,
        app.owner_id,
        app.application_number,
        reason
      );
    }

    return app;
  });
}
