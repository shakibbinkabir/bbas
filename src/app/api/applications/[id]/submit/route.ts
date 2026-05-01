import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireRole,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import { applicationSubmitSchema } from '@/lib/validators';
import { getRequiredDocuments } from '@/lib/constants';
import { notifyApplicationSubmitted } from '@/lib/notifications/triggers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['owner']);

    // Load application with authority + documents.
    const { data: app, error: readErr } = await supabase
      .from('applications')
      .select(
        '*, authority:authorities(id, code), documents:application_documents(id, document_type, upload_status)'
      )
      .eq('id', id)
      .maybeSingle();

    if (readErr) {
      throw new HttpError(500, readErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!app) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }
    if (app.owner_id !== profile.id) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }
    if (app.status !== 'draft') {
      throw new HttpError(
        409,
        'Only draft applications can be submitted',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // Validate required fields.
    const candidate = {
      authorityId: app.authority_id,
      projectNameEn: app.project_name_en,
      projectNameBn: app.project_name_bn,
      buildingType: app.building_type,
      numFloors: app.num_floors,
      totalAreaSqft: app.total_area_sqft,
      estimatedCostBdt: app.estimated_cost_bdt,
      landMouza: app.land_mouza,
      landKhatianNo: app.land_khatian_no,
      landDagNo: app.land_dag_no,
      landAreaKatha: app.land_area_katha,
      landAddressEn: app.land_address_en,
      landAddressBn: app.land_address_bn,
      landLatitude: app.land_latitude,
      landLongitude: app.land_longitude,
      hasSolarPanel: app.has_solar_panel,
      hasRainwaterHarvest: app.has_rainwater_harvest,
      hasGreenRoof: app.has_green_roof,
      hasEvCharging: app.has_ev_charging,
      greenDescription: app.green_description,
    };

    const parsed = applicationSubmitSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Application is incomplete',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    // Validate required documents based on building type.
    const required = getRequiredDocuments(app.building_type);
    const uploadedTypes = new Set(
      (app.documents ?? [])
        .filter((d: { upload_status: string }) =>
          ['uploaded', 'verified'].includes(d.upload_status)
        )
        .map((d: { document_type: string }) => d.document_type)
    );
    const missing = required
      .filter((d) => !uploadedTypes.has(d.value))
      .map((d) => d.value);

    if (missing.length > 0) {
      throw new HttpError(
        400,
        'Required documents are missing',
        ErrorCode.VALIDATION_ERROR,
        { missingDocuments: missing }
      );
    }

    // Generate a real application number now that authority is locked in.
    const authCode = (app.authority as { code: string } | null)?.code;
    if (!authCode) {
      throw new HttpError(
        500,
        'Application is missing authority code',
        ErrorCode.INTERNAL_ERROR
      );
    }

    const { data: numberData, error: rpcErr } = await supabase.rpc(
      'generate_application_number',
      { auth_code: authCode }
    );
    if (rpcErr || !numberData) {
      throw new HttpError(
        500,
        rpcErr?.message ?? 'Failed to generate application number',
        ErrorCode.INTERNAL_ERROR
      );
    }
    const applicationNumber = numberData as unknown as string;
    const submittedAt = new Date().toISOString();

    const { data: updated, error: updErr } = await supabase
      .from('applications')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
        application_number: applicationNumber,
        current_stage: 1,
      })
      .eq('id', id)
      .select('id, application_number, status, current_stage')
      .single();

    if (updErr) {
      throw new HttpError(500, updErr.message, ErrorCode.INTERNAL_ERROR);
    }

    // Append workflow_history entry.
    const { error: histErr } = await supabase.from('workflow_history').insert({
      application_id: id,
      from_stage: app.current_stage,
      to_stage: 1,
      from_status: app.status,
      to_status: 'submitted',
      action: 'submit',
      performed_by: profile.id,
    });
    if (histErr) {
      // Submission already happened; log and continue.
      console.error('[submit] workflow_history insert failed', histErr);
    }

    void notifyApplicationSubmitted(id, profile.id, applicationNumber);

    return {
      applicationNumber: updated.application_number,
      status: updated.status,
    };
  });
}
