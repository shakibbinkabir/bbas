import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireRole,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';

interface RouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  return handleRoute(async () => {
    const { applicationId } = await ctx.params;
    if (!applicationId) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }

    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['officer', 'admin']);

    // Verify access — same authority.
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, authority_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (appErr) throw new HttpError(500, appErr.message, ErrorCode.INTERNAL_ERROR);
    if (!app) throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    if (profile.authority_id && app.authority_id !== profile.authority_id) {
      throw new HttpError(403, 'You do not have access to this application', ErrorCode.FORBIDDEN);
    }

    const { data, error } = await supabase
      .from('ai_scoring_results')
      .select('*')
      .eq('application_id', applicationId)
      .order('scored_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);

    if (!data) {
      return { scored: false };
    }

    const findings = (data.findings ?? {}) as {
      categories?: unknown[];
      summary?: string;
      critical_issues_count?: number;
      recommendation?: string;
    };
    const recommendations = (data.recommendations ?? {}) as {
      recommendation?: string;
      summary?: string;
    };

    return {
      scored: true,
      id: data.id,
      overall_score: data.overall_score,
      categories: findings.categories ?? [],
      summary: findings.summary ?? recommendations.summary ?? '',
      critical_issues_count: findings.critical_issues_count ?? 0,
      recommendation: findings.recommendation ?? recommendations.recommendation ?? null,
      scored_at: data.scored_at,
      model_version: data.model_version,
      tokens_used: data.tokens_used,
    };
  });
}
