import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  handleRoute,
  requireAuth,
  requireRole,
  HttpError,
  ErrorCode,
} from '@/lib/utils/api';
import { applicationDraftSchema } from '@/lib/validators';
import type { Database } from '@/types/database';

type ApplicationUpdate = Database['public']['Tables']['applications']['Update'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Map camelCase fields from the validator to snake_case DB columns. */
function toDbUpdates(input: Record<string, unknown>): ApplicationUpdate {
  const map: Record<string, string> = {
    authorityId: 'authority_id',
    projectNameEn: 'project_name_en',
    projectNameBn: 'project_name_bn',
    buildingType: 'building_type',
    numFloors: 'num_floors',
    totalAreaSqft: 'total_area_sqft',
    estimatedCostBdt: 'estimated_cost_bdt',
    landMouza: 'land_mouza',
    landKhatianNo: 'land_khatian_no',
    landDagNo: 'land_dag_no',
    landAreaKatha: 'land_area_katha',
    landAddressEn: 'land_address_en',
    landAddressBn: 'land_address_bn',
    landLatitude: 'land_latitude',
    landLongitude: 'land_longitude',
    hasSolarPanel: 'has_solar_panel',
    hasRainwaterHarvest: 'has_rainwater_harvest',
    hasGreenRoof: 'has_green_roof',
    hasEvCharging: 'has_ev_charging',
    greenDescription: 'green_description',
  };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const dbKey = map[k];
    if (dbKey) result[dbKey] = v;
  }
  return result as ApplicationUpdate;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const { data, error } = await supabase
      .from('applications')
      .select(
        '*, authority:authorities(*), documents:application_documents(*)'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!data) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }

    if (profile.role === 'owner' && data.owner_id !== profile.id) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }
    if (
      profile.role === 'officer' &&
      profile.authority_id !== data.authority_id
    ) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }

    return data;
  });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['owner']);

    const { data: existing, error: readErr } = await supabase
      .from('applications')
      .select('id, owner_id, status')
      .eq('id', id)
      .maybeSingle();

    if (readErr) {
      throw new HttpError(500, readErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!existing) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }
    if (existing.owner_id !== profile.id) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }
    if (
      existing.status !== 'draft' &&
      existing.status !== 'information_requested'
    ) {
      throw new HttpError(
        409,
        'Application is no longer editable',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const body = await req.json();
    const parsed = applicationDraftSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const updates = toDbUpdates(parsed.data as Record<string, unknown>);
    if (Object.keys(updates).length === 0) {
      // Nothing to write — return existing row without touching updated_at.
      const { data: row } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      return row;
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    return data;
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireRole(supabase, ['owner']);

    const { data: existing, error: readErr } = await supabase
      .from('applications')
      .select('id, owner_id, status')
      .eq('id', id)
      .maybeSingle();

    if (readErr) {
      throw new HttpError(500, readErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!existing) {
      throw new HttpError(404, 'Application not found', ErrorCode.NOT_FOUND);
    }
    if (existing.owner_id !== profile.id) {
      throw new HttpError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }
    if (existing.status !== 'draft') {
      throw new HttpError(
        409,
        'Only draft applications can be deleted',
        ErrorCode.VALIDATION_ERROR
      );
    }

    // application_documents is ON DELETE CASCADE, so the children come with it.
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    return new NextResponse(null, { status: 204 });
  });
}
