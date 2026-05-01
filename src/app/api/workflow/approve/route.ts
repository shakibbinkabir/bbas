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
import { notifyApplicationApproved } from '@/lib/notifications/triggers';

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['admin']);

    const body = await req.json().catch(() => ({}));
    const applicationId = body?.applicationId as string | undefined;
    const comment = body?.comment as string | undefined;

    if (!applicationId) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }

    const engine = new WorkflowEngine(supabase);
    const result = unwrap(
      await engine.approve({
        applicationId,
        performedBy: profile.id,
        performerRole: profile.role,
        comment,
      })
    );

    const app = result.application!;
    if (app.application_number) {
      void notifyApplicationApproved(
        app.id,
        app.owner_id,
        app.application_number
      );
    }

    return app;
  });
}
