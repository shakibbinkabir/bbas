import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, apiSuccess, HttpError, ErrorCode } from '@/lib/utils/api';
import { registrationSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new HttpError(401, 'Verify your phone or email first', ErrorCode.UNAUTHORIZED);
    }

    const body = await req.json();
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const { fullNameEn, fullNameBn, phone, email, preferredLanguage } = parsed.data;

    // Idempotent: if a profile already exists for this auth user, return it.
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*, authority:authorities(*)')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      return apiSuccess(existing, 200);
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        role: 'owner',
        full_name_en: fullNameEn,
        full_name_bn: fullNameBn,
        phone,
        email,
        preferred_language: preferredLanguage,
      })
      .select('*, authority:authorities(*)')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    return apiSuccess(data, 201);
  });
}
