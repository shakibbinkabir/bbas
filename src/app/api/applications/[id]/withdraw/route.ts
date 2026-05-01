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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    if (!id) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }

    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['owner']);

    const body = await req.json().catch(() => ({}));
    const comment = body?.comment as string | undefined;

    const engine = new WorkflowEngine(supabase);
    const result = unwrap(
      await engine.withdraw({
        applicationId: id,
        performedBy: profile.id,
        performerRole: profile.role,
        comment,
      })
    );

    return result.application;
  });
}
