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
      throw new HttpError(400, 'Comment cannot be empty', ErrorCode.VALIDATION_ERROR);
    }

    const engine = new WorkflowEngine(supabase);
    unwrap(
      await engine.addComment({
        applicationId,
        performedBy: profile.id,
        performerRole: profile.role,
        comment,
      })
    );

    return { ok: true };
  });
}
