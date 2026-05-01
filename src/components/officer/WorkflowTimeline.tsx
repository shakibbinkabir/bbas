'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeftCircle,
  ArrowRightCircle,
  CheckCircle2,
  CircleDashed,
  MessageCircle,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { cn, formatDateTime, toBanglaNumerals } from '@/lib/utils';
import type { WorkflowAction, WorkflowEntry } from '@/types';

interface WorkflowTimelineProps {
  applicationId: string;
}

function actionIcon(action: WorkflowAction) {
  switch (action) {
    case 'advance':
      return { Icon: ArrowRightCircle, cls: 'text-primary bg-primary/10' };
    case 'return':
      return { Icon: ArrowLeftCircle, cls: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40' };
    case 'reject':
      return { Icon: XCircle, cls: 'text-red-600 bg-red-100 dark:bg-red-950/40' };
    case 'approve':
      return { Icon: CheckCircle2, cls: 'text-green-600 bg-green-100 dark:bg-green-950/40' };
    case 'comment':
      return { Icon: MessageCircle, cls: 'text-muted-foreground bg-muted' };
    case 'assign':
      return { Icon: UserCheck, cls: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40' };
    case 'score':
      return { Icon: Sparkles, cls: 'text-purple-600 bg-purple-100 dark:bg-purple-950/40' };
    case 'submit':
      return { Icon: CheckCircle2, cls: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40' };
    default:
      return { Icon: CircleDashed, cls: 'text-muted-foreground bg-muted' };
  }
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

function describe(
  entry: WorkflowEntry,
  locale: 'bn' | 'en',
  t: Translator
): string {
  const fromStage = entry.from_stage ?? entry.to_stage;
  const num = (n: number) => (locale === 'bn' ? toBanglaNumerals(n) : String(n));
  switch (entry.action) {
    case 'advance':
      return t('officer.actionAdvance', {
        from: num(fromStage),
        to: num(entry.to_stage),
      });
    case 'return':
      return t('officer.actionReturn', { stage: num(entry.to_stage) });
    case 'reject':
      return t('officer.actionReject', { stage: num(entry.to_stage) });
    case 'approve':
      return t('officer.actionApprove', { stage: num(entry.to_stage) });
    case 'comment':
      return t('officer.actionComment');
    case 'assign':
      return t('officer.actionAssign');
    case 'submit':
      return t('officer.actionSubmit');
    case 'score':
      return t('officer.actionScore');
    default:
      return entry.action;
  }
}

function performerName(entry: WorkflowEntry, locale: 'bn' | 'en'): string {
  const p = entry.performed_by_profile;
  if (!p) return '—';
  const en = p.full_name_en;
  const bn = p.full_name_bn;
  return (locale === 'bn' ? bn || en : en || bn) || '—';
}

export function WorkflowTimeline({ applicationId }: WorkflowTimelineProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const [entries, setEntries] = useState<WorkflowEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workflow/${applicationId}/history`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? t('common.error'));
        if (!cancelled) setEntries((json.data as WorkflowEntry[]) ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId, t]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (entries === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('officer.noTimeline')}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const { Icon, cls } = actionIcon(entry.action);
        return (
          <li key={entry.id}>
            <Card>
              <CardContent className="flex gap-3 p-4">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    cls
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{describe(entry, locale, t)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at, locale)}
                    {' · '}
                    {t('officer.performedBy', { name: performerName(entry, locale) })}
                  </p>
                  {entry.comments && (
                    <p className="mt-2 rounded-md bg-muted/40 p-2 text-sm text-foreground">
                      {entry.comments}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
