'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { registrationSchema, type RegistrationInput } from '@/lib/validators';

const REG_STORAGE_KEY = 'bbas:registration';

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { preferredLanguage: 'bn' },
  });

  async function onSubmit(values: RegistrationInput) {
    setSubmitting(true);
    setServerError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          data: {
            phone: values.phone,
            full_name_en: values.fullNameEn,
            full_name_bn: values.fullNameBn,
            preferred_language: values.preferredLanguage,
          },
          shouldCreateUser: true,
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      sessionStorage.setItem(
        REG_STORAGE_KEY,
        JSON.stringify({ ...values, target: values.email, mode: 'register' })
      );
      toast.success(t('auth.registrationSuccess'));
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
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.registrationTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.registrationSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullNameEn">{t('auth.fullNameEn')}</Label>
          <Input id="fullNameEn" autoComplete="name" {...register('fullNameEn')} />
          {errors.fullNameEn && (
            <p className="text-sm text-destructive">{errors.fullNameEn.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullNameBn">{t('auth.fullNameBn')}</Label>
          <Input id="fullNameBn" lang="bn" className="text-bangla" {...register('fullNameBn')} />
          {errors.fullNameBn && (
            <p className="text-sm text-destructive">{errors.fullNameBn.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('auth.phone')}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('auth.phonePlaceholder')}
            {...register('phone')}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('auth.preferredLanguage')}</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="bn" defaultChecked {...register('preferredLanguage')} />
              {t('auth.languageBn')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="en" {...register('preferredLanguage')} />
              {t('auth.languageEn')}
            </label>
          </div>
        </fieldset>

        {serverError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t('auth.registering') : t('auth.sendOtp')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('auth.loginLink')}
        </Link>
      </p>
    </div>
  );
}
