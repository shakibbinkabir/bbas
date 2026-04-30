'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { bdPhoneRegex } from '@/lib/validators';

const REG_STORAGE_KEY = 'bbas:registration';
const LOGIN_STORAGE_KEY = 'bbas:login';
const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60;

interface SessionState {
  target: string;
  mode: 'register' | 'login';
  via?: 'phone' | 'email';
  fullNameEn?: string;
  fullNameBn?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: 'bn' | 'en';
}

function readSessionState(): SessionState | null {
  if (typeof window === 'undefined') return null;
  const raw =
    sessionStorage.getItem(REG_STORAGE_KEY) ?? sessionStorage.getItem(LOGIN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export default function VerifyOtpPage() {
  const t = useTranslations();
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const s = readSessionState();
    if (!s) {
      router.replace('/login');
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH && /^\d{6}$/.test(code);

  const targetLabel = useMemo(() => {
    if (!session) return '';
    return session.target;
  }, [session]);

  function handleChange(index: number, raw: string) {
    const v = raw.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = v;
      return next;
    });
    if (v && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  async function handleVerify() {
    if (!session || !isComplete) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const isPhone = session.via === 'phone' || (session.target && bdPhoneRegex.test(session.target));

      const verifyParams = isPhone
        ? ({ phone: session.target, token: code, type: 'sms' } as const)
        : ({ email: session.target, token: code, type: 'email' } as const);

      const { error: verifyError } = await supabase.auth.verifyOtp(verifyParams);

      if (verifyError) {
        setError(verifyError.message || t('auth.invalidOtp'));
        return;
      }

      // Registration flow → create user_profiles row.
      if (session.mode === 'register') {
        const res = await fetch('/api/auth/complete-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullNameEn: session.fullNameEn,
            fullNameBn: session.fullNameBn,
            phone: session.phone,
            email: session.email,
            preferredLanguage: session.preferredLanguage ?? 'bn',
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || t('common.error'));
          return;
        }
        sessionStorage.removeItem(REG_STORAGE_KEY);
        toast.success(t('messages.applicationSubmitted'));
        router.push('/owner/dashboard');
        return;
      }

      // Login flow → middleware will route to the right dashboard.
      sessionStorage.removeItem(LOGIN_STORAGE_KEY);
      router.push('/owner/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!session || resending) return;
    setResending(true);
    setError(null);

    try {
      const supabase = createClient();
      const isPhone = session.via === 'phone' || (session.target && bdPhoneRegex.test(session.target));
      const params = isPhone ? { phone: session.target } : { email: session.target };
      const { error: sendError } = await supabase.auth.signInWithOtp({
        ...params,
        options: { shouldCreateUser: session.mode === 'register' },
      });
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setSecondsLeft(OTP_TTL_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      toast.success(t('auth.otpSent'));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.verifyTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.otpInstruction', { target: targetLabel })}
        </p>
      </div>

      <div className="flex justify-between gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            className="h-14 w-12 rounded-md border border-input bg-background text-center text-xl font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button onClick={handleVerify} disabled={!isComplete || submitting} className="w-full">
        {submitting ? t('auth.verifying') : t('auth.verifyCode')}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {secondsLeft > 0
            ? t('auth.resendIn', { seconds: secondsLeft })
            : t('auth.otpExpired')}
        </span>
        <button
          type="button"
          onClick={handleResend}
          disabled={secondsLeft > 0 || resending}
          className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {t('auth.resendCode')}
        </button>
      </div>
    </div>
  );
}
