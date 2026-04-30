import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, requireAuth, HttpError, ErrorCode } from '@/lib/utils/api';
import { profileUpdateSchema } from '@/lib/validators';

export async function GET() {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);
    return profile;
  });
}

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid input',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const updates = parsed.data;
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name_en: updates.fullNameEn ?? profile.full_name_en,
        full_name_bn: updates.fullNameBn ?? profile.full_name_bn,
        phone: updates.phone ?? profile.phone,
        email: updates.email ?? profile.email,
      })
      .eq('id', profile.id)
      .select('*, authority:authorities(*)')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }
    return data;
  });
}
