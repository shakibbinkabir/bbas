'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import { useTheme } from '@/hooks/useTheme';
import type { LanguagePref, ThemePref, UserProfile } from '@/types';

interface ProfileFormProps {
  profile: UserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullNameEn, setFullNameEn] = useState(profile.full_name_en ?? '');
  const [fullNameBn, setFullNameBn] = useState(profile.full_name_bn ?? '');
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setFullNameEn(profile.full_name_en ?? '');
    setFullNameBn(profile.full_name_bn ?? '');
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setFullNameEn(profile.full_name_en ?? '');
    setFullNameBn(profile.full_name_bn ?? '');
    setError(null);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const trimmedEn = fullNameEn.trim();
      const trimmedBn = fullNameBn.trim();
      if (trimmedEn.length < 3 || trimmedBn.length < 3) {
        setError(t('errors.tooShort', { min: 3 }));
        return;
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullNameEn: trimmedEn,
          fullNameBn: trimmedBn,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? t('common.error'));
      }
      toast.success(t('profile.savedSuccess'));
      setEditing(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLanguageChange(next: LanguagePref) {
    if (next === locale) return;
    await setLocale(next);
    toast.success(t('messages.preferencesUpdated'));
  }

  async function handleThemeChange(next: ThemePref) {
    if (next === theme) return;
    await setTheme(next);
    toast.success(t('messages.preferencesUpdated'));
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('profile.personalInfo')}</h2>
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEdit}
            aria-label={t('common.edit')}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span>{t('common.edit')}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelEdit}
            aria-label={t('common.cancel')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span>{t('common.cancel')}</span>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullNameEn">{t('auth.fullNameEn')}</Label>
          {editing ? (
            <Input
              id="fullNameEn"
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              autoComplete="name"
              required
              minLength={3}
              maxLength={255}
            />
          ) : (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {profile.full_name_en || '—'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullNameBn">{t('auth.fullNameBn')}</Label>
          {editing ? (
            <Input
              id="fullNameBn"
              value={fullNameBn}
              onChange={(e) => setFullNameBn(e.target.value)}
              required
              minLength={3}
              maxLength={255}
              className="font-bengali"
            />
          ) : (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {profile.full_name_bn || '—'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('auth.phone')}</Label>
          <p
            id="phone"
            className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
            aria-readonly="true"
          >
            {profile.phone}
          </p>
          <p className="text-xs text-muted-foreground">{t('profile.phoneNote')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <p
            id="email"
            className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
            aria-readonly="true"
          >
            {profile.email || '—'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {editing && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={cancelEdit}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.loading') : t('profile.saveChanges')}
          </Button>
        </div>
      )}

      <div className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">{t('profile.preferences')}</h2>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('auth.preferredLanguage')}</legend>
          <div
            className="flex flex-wrap gap-3"
            role="radiogroup"
            aria-label={t('auth.preferredLanguage')}
          >
            {(['bn', 'en'] as LanguagePref[]).map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="preferredLanguage"
                  value={opt}
                  checked={locale === opt}
                  onChange={() => handleLanguageChange(opt)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{opt === 'bn' ? t('auth.languageBn') : t('auth.languageEn')}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('profile.preferredTheme')}</legend>
          <div
            className="flex flex-wrap gap-3"
            role="radiogroup"
            aria-label={t('profile.preferredTheme')}
          >
            {(['light', 'dark'] as ThemePref[]).map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="preferredTheme"
                  value={opt}
                  checked={theme === opt}
                  onChange={() => handleThemeChange(opt)}
                  className="h-4 w-4 accent-primary"
                />
                <span>
                  {opt === 'light' ? t('profile.themeLight') : t('profile.themeDark')}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </form>
  );
}
