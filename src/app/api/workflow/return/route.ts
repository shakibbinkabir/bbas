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
import { notifyInformationRequested } from '@/lib/notifications/triggers';

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['officer', 'admin']);

    const body = await req.json().catch(() => ({}));
    const applicationId = body?.applicationId as string | undefined;
    const comment = ((body?.comment as string | undefined) ?? '').trim();

    if (!applicationId) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }
    if (!comment) {
      throw new HttpError(400, 'Comment is required', ErrorCode.VALIDATION_ERROR);
    }
    if (comment.length < MIN_COMMENT_LENGTH) {
      throw new HttpError(
        400,
        `Comment must be at least ${MIN_COMMENT_LENGTH} characters`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const engine = new WorkflowEngine(supabase);
    const result = unwrap(
      await engine.return({
        applicationId,
        performedBy: profile.id,
        performerRole: profile.role,
        comment,
      })
    );

    const app = result.application!;
    if (app.application_number) {
      void notifyInformationRequested(
        app.id,
        app.owner_id,
        app.application_number,
        comment
      );
    }

    return app;
  });
}
