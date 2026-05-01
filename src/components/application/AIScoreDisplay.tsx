'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/application/EmptyState';
import { useLocale } from '@/hooks/useLocale';
import { cn, formatDateTime, toBanglaNumerals } from '@/lib/utils';

type Severity = 'critical' | 'major' | 'minor';
type Recommendation = 'approve' | 'needs_correction' | 'reject';

export interface AIFinding {
  severity: Severity;
  description: string;
  rule_reference?: string | null;
  recommendation?: string | null;
  document_type?: string | null;
}

export interface AICategory {
  name: string;
  score: number;
  findings: AIFinding[];
}

export interface AIScoreResult {
  scored: true;
  id: string;
  overall_score: number;
  categories: AICategory[];
  summary: string;
  critical_issues_count: number;
  recommendation: Recommendation | null;
  scored_at: string;
  model_version?: string | null;
  tokens_used?: number | null;
}

export interface AIScoreEmpty {
  scored: false;
}

export type AIScoreResponse = AIScoreResult | AIScoreEmpty;

interface AIScoreDisplayProps {
  applicationId: string;
  initialScore?: AIScoreResponse;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreStroke(score: number): string {
  if (score >= 80) return 'stroke-green-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-red-500';
}

function scoreBarBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function severityMeta(severity: Severity, t: (_key: string) => string) {
  switch (severity) {
    case 'critical':
      return {
        Icon: AlertOctagon,
        label: t('officer.severityCritical'),
        cls: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
      };
    case 'major':
      return {
        Icon: AlertTriangle,
        label: t('officer.severityMajor'),
        cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      };
    default:
      return {
        Icon: Info,
        label: t('officer.severityMinor'),
        cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
      };
  }
}

function recommendationMeta(rec: Recommendation | null, t: (_key: string) => string) {
  switch (rec) {
    case 'approve':
      return {
        label: t('officer.recApprove'),
        cls: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
      };
    case 'needs_correction':
      return {
        label: t('officer.recNeedsCorrection'),
        cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      };
    case 'reject':
      return {
        label: t('officer.recReject'),
        cls: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
      };
    default:
      return null;
  }
}

function ScoreGauge({ score, locale }: { score: number; locale: 'bn' | 'en' }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const display = locale === 'bn' ? toBanglaNumerals(Math.round(score)) : Math.round(score);
  return (
    <div className="relative inline-flex h-32 w-32 items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} strokeWidth="10" className="fill-none stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          className={cn('fill-none transition-[stroke-dashoffset]', scoreStroke(score))}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className={cn('absolute text-center', scoreColor(score))}>
        <div className="text-3xl font-bold tabular-nums">{display}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

export function AIScoreDisplay({ applicationId, initialScore }: AIScoreDisplayProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const [data, setData] = useState<AIScoreResponse | null>(initialScore ?? null);
  const [loading, setLoading] = useState(!initialScore);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const fetchScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/score/${applicationId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: AIScoreResponse };
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (!initialScore) void fetchScore();
  }, [fetchScore, initialScore]);

  async function runScoring() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error ?? `HTTP ${res.status}`;
        toast.error(msg);
        setError(msg);
        return;
      }
      // Re-fetch via GET so we get the same shape (with `scored: true`).
      await fetchScore();
      toast.success(t('officer.scoringComplete'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }

  function toggle(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const totals = useMemo(() => {
    if (!data || data.scored !== true) return null;
    let total = 0;
    let critical = 0;
    let major = 0;
    let minor = 0;
    for (const cat of data.categories) {
      for (const f of cat.findings) {
        total += 1;
        if (f.severity === 'critical') critical += 1;
        else if (f.severity === 'major') major += 1;
        else minor += 1;
      }
    }
    return { total, critical, major, minor, categories: data.categories.length };
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 p-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{t('common.loading')}</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('officer.scoringError')}
        description={t('officer.scoringErrorDesc')}
        action={{ label: t('common.retry'), onClick: () => void fetchScore() }}
      />
    );
  }

  if (!data || data.scored === false) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('officer.noScoringTitle')}
        description={t('officer.noScoringDesc')}
        action={{
          label: running ? t('officer.scoringRunning') : t('officer.runScoring'),
          onClick: () => {
            if (!running) void runScoring();
          },
        }}
      />
    );
  }

  const recMeta = recommendationMeta(data.recommendation, t);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center">
          <ScoreGauge score={data.overall_score} locale={locale} />
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <p className="text-sm font-medium text-muted-foreground">
              {t('officer.scoreOverall')}
            </p>
            <p className={cn('text-2xl font-semibold', scoreColor(data.overall_score))}>
              {locale === 'bn' ? toBanglaNumerals(data.overall_score) : data.overall_score} / 100
            </p>
            <p className="text-xs text-muted-foreground">
              {t('officer.lastScored')}: {formatDateTime(data.scored_at, locale)}
            </p>
            {recMeta && (
              <Badge
                variant="outline"
                className={cn('mt-2 border-transparent text-xs', recMeta.cls)}
              >
                {recMeta.label}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runScoring()}
            disabled={running}
            className="gap-1"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            )}
            {running ? t('officer.scoringRunning') : t('officer.rerunScoring')}
          </Button>
        </CardContent>
      </Card>

      {data.summary && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
          {data.summary}
        </div>
      )}

      {totals && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            {t('officer.statCritical')}:{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {locale === 'bn' ? toBanglaNumerals(totals.critical) : totals.critical}
            </span>
          </span>
          <span>
            {t('officer.statMajor')}:{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {locale === 'bn' ? toBanglaNumerals(totals.major) : totals.major}
            </span>
          </span>
          <span>
            {t('officer.statMinor')}:{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {locale === 'bn' ? toBanglaNumerals(totals.minor) : totals.minor}
            </span>
          </span>
          <span>
            {t('officer.statCategories')}:{' '}
            <span className="font-semibold">
              {locale === 'bn' ? toBanglaNumerals(totals.categories) : totals.categories}
            </span>
          </span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data.categories.map((cat, idx) => {
          const isOpen = expanded.has(idx);
          const counts = cat.findings.reduce(
            (acc, f) => {
              acc[f.severity] = (acc[f.severity] ?? 0) + 1;
              return acc;
            },
            { critical: 0, major: 0, minor: 0 } as Record<Severity, number>
          );
          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <span className={cn('text-xl font-bold tabular-nums', scoreColor(cat.score))}>
                        {locale === 'bn' ? toBanglaNumerals(cat.score) : cat.score}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full transition-all', scoreBarBg(cat.score))}
                        style={{ width: `${Math.max(0, Math.min(100, cat.score))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('officer.findingsCount', {
                        critical: counts.critical,
                        major: counts.major,
                        minor: counts.minor,
                      })}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>

                {isOpen && cat.findings.length > 0 && (
                  <ul className="mt-3 space-y-3 border-t border-border pt-3">
                    {cat.findings.map((f, i) => {
                      const meta = severityMeta(f.severity, t);
                      const Icon = meta.Icon;
                      return (
                        <li key={i} className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn('gap-1 border-transparent text-xs', meta.cls)}
                            >
                              <Icon className="h-3 w-3" aria-hidden="true" />
                              {meta.label}
                            </Badge>
                            {f.rule_reference && (
                              <span className="font-mono text-xs text-muted-foreground">
                                {f.rule_reference}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{f.description}</p>
                          {f.recommendation && (
                            <p className="text-xs italic text-muted-foreground">
                              <span className="font-medium not-italic">
                                {t('officer.recommendation')}:
                              </span>{' '}
                              {f.recommendation}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
