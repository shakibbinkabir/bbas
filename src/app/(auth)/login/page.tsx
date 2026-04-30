'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { bdPhoneRegex, loginSchema, type LoginInput } from '@/lib/validators';

const LOGIN_STORAGE_KEY = 'bbas:login';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit({ identifier }: LoginInput) {
    setServerError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const isPhone = bdPhoneRegex.test(identifier);
      const params = isPhone ? { phone: identifier } : { email: identifier };

      const { error } = await supabase.auth.signInWithOtp({
        ...params,
        options: { shouldCreateUser: false },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      sessionStorage.setItem(
        LOGIN_STORAGE_KEY,
        JSON.stringify({ target: identifier, mode: 'login', via: isPhone ? 'phone' : 'email' })
      );
      toast.success(t('auth.otpSent'));
      router.push('/verify-otp');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.loginTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="identifier">
            {t('auth.phone')} / {t('auth.email')}
          </Label>
          <Input
            id="identifier"
            autoComplete="username"
            placeholder={t('auth.phonePlaceholder')}
            {...register('identifier')}
          />
          {errors.identifier && (
            <p className="text-sm text-destructive">{errors.identifier.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t('auth.loggingIn') : t('auth.sendOtp')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.dontHaveAccount')}{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t('auth.registerLink')}
        </Link>
      </p>
    </div>
  );
}
