import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireRole,
  HttpError,
  ErrorCode,
  apiError,
} from '@/lib/utils/api';
import {
  geminiModel,
  GEMINI_MODEL_VERSION,
  analyzeDocuments,
} from '@/lib/gemini/client';
import {
  buildCompliancePrompt,
  estimateTokens,
  type PromptDocument,
} from '@/lib/gemini/prompt-builder';
import { extractDocumentText } from '@/lib/gemini/pdf-extractor';
import { checkRateLimit } from '@/lib/gemini/rate-limiter';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ScoreFinding {
  severity: 'critical' | 'major' | 'minor';
  description: string;
  rule_reference?: string;
  recommendation?: string;
  document_type?: string;
}

interface ScoreCategory {
  name: string;
  score: number;
  findings: ScoreFinding[];
}

interface AIScorePayload {
  overall_score: number;
  categories: ScoreCategory[];
  summary: string;
  critical_issues_count: number;
  recommendation: 'approve' | 'needs_correction' | 'reject';
}

function tryParseJson(text: string): AIScorePayload | null {
  try {
    return JSON.parse(text) as AIScorePayload;
  } catch {
    // Strip markdown fences sometimes emitted despite responseMimeType=json.
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(stripped) as AIScorePayload;
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['officer', 'admin']);

    if (!geminiModel) {
      return apiError(
        'AI scoring is not configured. Please contact the administrator.',
        503,
        ErrorCode.AI_SERVICE_ERROR
      );
    }

    const body = (await req.json().catch(() => ({}))) as { applicationId?: string };
    const applicationId = body.applicationId?.trim();
    if (!applicationId) {
      throw new HttpError(400, 'applicationId is required', ErrorCode.VALIDATION_ERROR);
    }

    // 1. Load application + verify access (officer/admin scoped to their authority).
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select(
        'id, application_number, authority_id, building_type, num_floors, total_area_sqft, land_area_katha, land_address_en, authority:authorities(code)'
      )
      .eq('id', applicationId)
      .maybeSingle();

    if (appErr) {
      throw new HttpError(500, appErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!app) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }
    if (profile.authority_id && app.authority_id !== profile.authority_id) {
      throw new HttpError(403, 'You do not have access to this application', ErrorCode.FORBIDDEN);
    }

    // 2. Rate limit at the user/authority level — 10/min globally is fine for MVP.
    const limit = checkRateLimit(10);
    if (!limit.allowed) {
      return apiError(
        'Rate limited. Max 10 scoring requests per minute.',
        429,
        ErrorCode.RATE_LIMITED,
        { retryAfter: limit.retryAfter }
      );
    }

    // 3. Fetch documents + extract text from PDFs.
    const { data: documents, error: docErr } = await supabase
      .from('application_documents')
      .select('id, document_type, file_name, file_path, mime_type')
      .eq('application_id', applicationId);

    if (docErr) {
      throw new HttpError(500, docErr.message, ErrorCode.INTERNAL_ERROR);
    }

    const promptDocs: (PromptDocument & { id: string })[] = [];
    for (const doc of documents ?? []) {
      const textContent = await extractDocumentText(supabase, doc.file_path, doc.mime_type);
      promptDocs.push({
        id: doc.id,
        type: doc.document_type,
        fileName: doc.file_name,
        textContent,
      });
    }

    // 4. Build prompt (auto-truncates if estimated tokens exceed 25k).
    const authorityCode =
      Array.isArray(app.authority) ? app.authority[0]?.code : app.authority?.code;
    const prompt = buildCompliancePrompt({
      application: {
        buildingType: app.building_type ?? 'residential',
        numFloors: app.num_floors ?? 0,
        totalAreaSqft: app.total_area_sqft ?? 0,
        landAreaKatha: app.land_area_katha ?? 0,
        landAddressEn: app.land_address_en ?? '',
        authorityCode: authorityCode ?? 'RAJUK',
      },
      documents: promptDocs.map(({ type, fileName, textContent }) => ({
        type,
        fileName,
        textContent,
      })),
    });

    // 5. Call Gemini, retry once on JSON parse failure.
    let raw: string;
    try {
      raw = await analyzeDocuments(prompt);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      if (msg === 'AI_RATE_LIMITED') {
        return apiError(
          'AI service temporarily unavailable, please try again in a minute.',
          503,
          ErrorCode.AI_SERVICE_ERROR
        );
      }
      return apiError(
        'AI scoring failed. Please try again or review manually.',
        503,
        ErrorCode.AI_SERVICE_ERROR
      );
    }

    let parsed = tryParseJson(raw);
    if (!parsed) {
      try {
        const retry = await analyzeDocuments(
          `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown fences, no explanation outside the JSON object.`
        );
        parsed = tryParseJson(retry);
        if (parsed) raw = retry;
      } catch {
        // fall through
      }
    }
    if (!parsed) {
      return apiError(
        'AI returned an invalid response. Please retry or review manually.',
        503,
        ErrorCode.AI_SERVICE_ERROR
      );
    }

    // 6. Persist scoring result.
    const tokensUsed = estimateTokens(prompt) + estimateTokens(raw);
    const { data: stored, error: storeErr } = await supabase
      .from('ai_scoring_results')
      .insert({
        application_id: applicationId,
        overall_score: Math.max(0, Math.min(100, Math.round(parsed.overall_score))),
        findings: parsed as unknown as Json,
        recommendations: {
          recommendation: parsed.recommendation,
          summary: parsed.summary,
        } as unknown as Json,
        raw_response: raw,
        model_version: GEMINI_MODEL_VERSION,
        tokens_used: tokensUsed,
      })
      .select()
      .single();

    if (storeErr) {
      throw new HttpError(500, storeErr.message, ErrorCode.INTERNAL_ERROR);
    }

    // 7. Update application + per-document scores.
    await supabase
      .from('applications')
      .update({
        ai_compliance_score: parsed.overall_score,
        ai_scored_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    // Aggregate findings per document_type referenced inside category findings.
    const perDocFindings = new Map<string, ScoreFinding[]>();
    for (const cat of parsed.categories ?? []) {
      for (const f of cat.findings ?? []) {
        if (!f.document_type) continue;
        if (!perDocFindings.has(f.document_type)) perDocFindings.set(f.document_type, []);
        perDocFindings.get(f.document_type)!.push(f);
      }
    }
    for (const doc of promptDocs) {
      const findings = perDocFindings.get(doc.type) ?? [];
      const docScore =
        findings.length === 0
          ? parsed.overall_score
          : Math.max(
              0,
              100 -
                findings.reduce((acc, f) => {
                  if (f.severity === 'critical') return acc + 30;
                  if (f.severity === 'major') return acc + 15;
                  return acc + 5;
                }, 0)
            );
      await supabase
        .from('application_documents')
        .update({
          ai_score: Math.round(docScore),
          ai_findings: findings as unknown as Json,
        })
        .eq('id', doc.id);
    }

    return {
      id: stored.id,
      overall_score: parsed.overall_score,
      categories: parsed.categories,
      summary: parsed.summary,
      critical_issues_count: parsed.critical_issues_count,
      recommendation: parsed.recommendation,
      scored_at: stored.scored_at,
      model_version: stored.model_version,
      tokens_used: stored.tokens_used,
    };
  });
}
