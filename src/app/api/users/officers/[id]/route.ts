import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ErrorCode,
  HttpError,
  handleRoute,
  requireRole,
} from '@/lib/utils/api';
import { bdPhoneRegex } from '@/lib/validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateOfficerSchema = z.object({
  fullNameEn: z.string().trim().min(3).max(255).optional(),
  fullNameBn: z.string().trim().min(3).max(255).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, 'Phone must be a valid Bangladesh number')
    .optional(),
});

/**
 * PUT /api/users/officers/[id] — admin updates an officer's name / contact.
 * Cannot change `role` or `authority_id`; cross-authority access is blocked.
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      throw new HttpError(400, 'Invalid officer id', ErrorCode.VALIDATION_ERROR);
    }

    const supabase = await createServerSupabaseClient();
    const { profile: admin } = await requireRole(supabase, ['admin']);

    if (!admin.authority_id) {
      throw new HttpError(
        403,
        'Admin is not linked to an authority',
        ErrorCode.FORBIDDEN
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateOfficerSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const adminClient = createAdminClient();

    const { data: target, error: fetchErr } = await adminClient
      .from('user_profiles')
      .select('id, role, authority_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      throw new HttpError(500, fetchErr.message, ErrorCode.INTERNAL_ERROR);
    }
    if (!target) {
      throw new HttpError(404, 'Officer not found', ErrorCode.NOT_FOUND);
    }
    if (target.authority_id !== admin.authority_id) {
      throw new HttpError(
        403,
        'You can only manage officers in your authority',
        ErrorCode.FORBIDDEN
      );
    }
    if (target.role !== 'officer' && target.role !== 'admin') {
      throw new HttpError(
        400,
        'Only officer or admin profiles can be edited here',
        ErrorCode.VALIDATION_ERROR
      );
    }

    const updates: {
      full_name_en?: string;
      full_name_bn?: string;
      email?: string;
      phone?: string;
    } = {};
    if (parsed.data.fullNameEn !== undefined) updates.full_name_en = parsed.data.fullNameEn;
    if (parsed.data.fullNameBn !== undefined) updates.full_name_bn = parsed.data.fullNameBn;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, 'No fields to update', ErrorCode.VALIDATION_ERROR);
    }

    const { data, error } = await adminClient
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select('*, authority:authorities(*)')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    // Keep the auth user's email/phone in sync so the next OTP login works.
    if (parsed.data.email || parsed.data.phone) {
      await adminClient.auth.admin
        .updateUserById(id, {
          email: parsed.data.email,
          phone: parsed.data.phone,
        })
        .catch(() => undefined);
    }

    return data;
  });
}
