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
import { notifyCorrectionsReceived } from '@/lib/notifications/triggers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    if (!id) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }

    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['owner']);

    const engine = new WorkflowEngine(supabase);
    const result = unwrap(
      await engine.submitCorrections({
        applicationId: id,
        performedBy: profile.id,
        performerRole: profile.role,
      })
    );

    const app = result.application!;
    if (app.application_number && app.assigned_officer_id) {
      void notifyCorrectionsReceived(
        app.id,
        app.assigned_officer_id,
        app.application_number
      );
    }

    return app;
  });
}
