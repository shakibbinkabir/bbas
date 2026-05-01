'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { cn, formatDateTime } from '@/lib/utils';
import type { WorkflowEntry } from '@/types';

interface MessageThreadProps {
  applicationId: string;
}

function performerName(entry: WorkflowEntry, locale: 'bn' | 'en'): string {
  const p = entry.performed_by_profile;
  if (!p) return '—';
  const en = p.full_name_en;
  const bn = p.full_name_bn;
  return (locale === 'bn' ? bn || en : en || bn) || '—';
}

export function MessageThread({ applicationId }: MessageThreadProps) {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = useLocale();
  const [entries, setEntries] = useState<WorkflowEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflow/${applicationId}/history`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      const all = (json.data as WorkflowEntry[]) ?? [];
      // Show only conversational entries: comments and returns (which carry
      // explanatory text). Sort chronologically (oldest first for chat feel).
      const filtered = all
        .filter((e) => e.action === 'comment' || e.action === 'return')
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      setEntries(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  }, [applicationId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/workflow/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId,
          comment: text.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      setText('');
      await load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('officer.noMessages')}
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => {
            const isOfficer =
              entry.performed_by_profile?.role === 'officer' ||
              entry.performed_by_profile?.role === 'admin';
            return (
              <li
                key={entry.id}
                className={cn('flex', isOfficer ? 'justify-end' : 'justify-start')}
              >
                <Card
                  className={cn(
                    'max-w-[80%]',
                    isOfficer
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-muted/30'
                  )}
                >
                  <CardContent className="space-y-1 p-3">
                    <p className="text-sm">{entry.comments ?? ''}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {performerName(entry, locale)} ·{' '}
                      {formatDateTime(entry.created_at, locale)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSend} className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('officer.messagePlaceholder')}
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={sending || !text.trim()} className="gap-1">
            <Send className="h-4 w-4" aria-hidden="true" />
            {t('officer.send')}
          </Button>
        </div>
      </form>
    </div>
  );
}
