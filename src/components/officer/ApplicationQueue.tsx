'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileQuestion,
  FileX,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { StageBadge } from '@/components/application/StageBadge';
import { StatusBadge } from '@/components/application/StatusBadge';
import { EmptyState } from '@/components/application/EmptyState';
import { useLocale } from '@/hooks/useLocale';
import {
  BUILDING_TYPES,
  ITEMS_PER_PAGE,
  STAGES,
  STATUS_LIST,
} from '@/lib/constants';
import { cn, formatDate, toBanglaNumerals } from '@/lib/utils';
import type { AppStatus, Application, BuildingType } from '@/types';

type SortField =
  | 'application_number'
  | 'submitted_at'
  | 'updated_at'
  | 'status'
  | 'current_stage'
  | 'ai_compliance_score'
  | 'building_type';
type SortOrder = 'asc' | 'desc';
type SortChangeHandler = (field: SortField) => void;

interface ApiResponse {
  data: Application[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const OFFICER_STATUS_FILTERS: AppStatus[] = [
  'submitted',
  'under_review',
  'information_requested',
  'corrections_submitted',
];

function getApplicantName(app: Application, locale: 'bn' | 'en'): string {
  const owner = app.owner;
  if (!owner) return '—';
  const primary = locale === 'bn' ? owner.full_name_bn : owner.full_name_en;
  const secondary = locale === 'bn' ? owner.full_name_en : owner.full_name_bn;
  return primary || secondary || owner.phone || '—';
}

function getBuildingTypeLabel(value: BuildingType, locale: 'bn' | 'en'): string {
  const meta = BUILDING_TYPES.find((b) => b.value === value);
  if (!meta) return value;
  return locale === 'bn' ? meta.labelBn : meta.labelEn;
}

function getStatusLabel(status: AppStatus, locale: 'bn' | 'en'): string {
  const meta = STATUS_LIST.find((s) => s.value === status);
  if (!meta) return status;
  return locale === 'bn' ? meta.labelBn : meta.labelEn;
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function aiScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function daysPendingColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground';
  if (days > 30) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days > 14) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-foreground';
}

function urgencyBorder(days: number | null): string {
  if (days === null) return '';
  if (days > 30) return 'border-l-4 border-l-red-500';
  if (days > 14) return 'border-l-4 border-l-amber-500';
  return '';
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  current: SortField;
  order: SortOrder;
  onChange: SortChangeHandler;
  className?: string;
}

function SortableHeader({
  field,
  label,
  current,
  order,
  onChange,
  className,
}: SortableHeaderProps) {
  const active = current === field;
  const sortLabel = active
    ? order === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  return (
    <button
      type="button"
      onClick={() => onChange(field)}
      className={cn(
        'inline-flex items-center gap-1 text-left font-medium hover:text-foreground transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
      title={sortLabel}
    >
      <span>{label}</span>
      {active ? (
        order === 'asc' ? (
          <ArrowUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
      )}
    </button>
  );
}

export function ApplicationQueue() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();

  const statusParam = (searchParams.get('status') as AppStatus | null) ?? null;
  const stageParam = searchParams.get('stage') ?? '';
  const buildingTypeParam = (searchParams.get('buildingType') as BuildingType | null) ?? null;
  const dateFromParam = searchParams.get('dateFrom') ?? '';
  const dateToParam = searchParams.get('dateTo') ?? '';
  const searchParamValue = searchParams.get('search') ?? '';
  const sortByParam = (searchParams.get('sortBy') as SortField | null) ?? 'submitted_at';
  const sortOrderParam = (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc';
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const [data, setData] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParamValue);

  // Sync local search input when URL changes externally (e.g. clear filters).
  useEffect(() => {
    setSearchInput(searchParamValue);
  }, [searchParamValue]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams]
  );

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusParam) qs.set('status', statusParam);
      if (stageParam) qs.set('stage', stageParam);
      if (buildingTypeParam) qs.set('buildingType', buildingTypeParam);
      if (dateFromParam) qs.set('dateFrom', dateFromParam);
      if (dateToParam) qs.set('dateTo', dateToParam);
      if (searchParamValue) qs.set('search', searchParamValue);
      qs.set('sortBy', sortByParam);
      qs.set('sortOrder', sortOrderParam);
      qs.set('page', String(pageParam));
      qs.set('limit', String(ITEMS_PER_PAGE));

      const res = await fetch(`/api/applications?${qs.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? t('common.error'));
      }
      const payload = (json.data as ApiResponse) ?? null;
      if (!payload) throw new Error(t('common.error'));
      setData(payload.data);
      setTotal(payload.total);
      setTotalPages(payload.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setData([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    statusParam,
    stageParam,
    buildingTypeParam,
    dateFromParam,
    dateToParam,
    searchParamValue,
    sortByParam,
    sortOrderParam,
    pageParam,
    t,
  ]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filtersActive =
    !!statusParam ||
    !!stageParam ||
    !!buildingTypeParam ||
    !!dateFromParam ||
    !!dateToParam ||
    !!searchParamValue;

  const rangeStart = total === 0 ? 0 : (pageParam - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(pageParam * ITEMS_PER_PAGE, total);

  const formatNumber = useCallback(
    (n: number) => (locale === 'bn' ? toBanglaNumerals(n) : String(n)),
    [locale]
  );

  const handleSort = (field: SortField) => {
    if (sortByParam === field) {
      updateParams({
        sortOrder: sortOrderParam === 'asc' ? 'desc' : 'asc',
        page: '1',
      });
    } else {
      updateParams({ sortBy: field, sortOrder: 'desc', page: '1' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim() || null, page: '1' });
  };

  const handleClearFilters = () => {
    updateParams({
      status: null,
      stage: null,
      buildingType: null,
      dateFrom: null,
      dateTo: null,
      search: null,
      page: '1',
    });
    setSearchInput('');
  };

  const stageOptions = useMemo(
    () =>
      STAGES.map((s) => ({
        value: String(s.number),
        label: `${formatNumber(s.number)} — ${locale === 'bn' ? s.nameBn : s.nameEn}`,
      })),
    [formatNumber, locale]
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 md:flex-row md:items-end"
            role="search"
          >
            <div className="flex-1 space-y-1">
              <label htmlFor="queue-search" className="text-xs font-medium text-muted-foreground">
                {t('common.search')}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="queue-search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('officer.searchPlaceholder')}
                  className="pl-9"
                  type="search"
                />
              </div>
            </div>
            <Button type="submit" variant="default">
              {t('common.search')}
            </Button>
            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="gap-1"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('list.clearFilters')}
              </Button>
            )}
          </form>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('officer.filterStatus')}
              </label>
              <Select
                value={statusParam ?? 'all'}
                onValueChange={(v) =>
                  updateParams({ status: v === 'all' ? null : v, page: '1' })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('officer.filterAll')}</SelectItem>
                  {OFFICER_STATUS_FILTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusLabel(s, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('officer.filterStage')}
              </label>
              <Select
                value={stageParam || 'all'}
                onValueChange={(v) =>
                  updateParams({ stage: v === 'all' ? null : v, page: '1' })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('officer.filterAll')}</SelectItem>
                  {stageOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('officer.filterBuildingType')}
              </label>
              <Select
                value={buildingTypeParam ?? 'all'}
                onValueChange={(v) =>
                  updateParams({ buildingType: v === 'all' ? null : v, page: '1' })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('officer.filterAll')}</SelectItem>
                  {BUILDING_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {locale === 'bn' ? bt.labelBn : bt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="queue-date-from"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('officer.filterDateFrom')}
              </label>
              <Input
                id="queue-date-from"
                type="date"
                value={dateFromParam}
                onChange={(e) =>
                  updateParams({ dateFrom: e.target.value || null, page: '1' })
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="queue-date-to"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('officer.filterDateTo')}
              </label>
              <Input
                id="queue-date-to"
                type="date"
                value={dateToParam}
                onChange={(e) =>
                  updateParams({ dateTo: e.target.value || null, page: '1' })
                }
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label={t('common.loading')}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-md bg-muted/60"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && total === 0 && (
        <EmptyState
          icon={filtersActive ? FileQuestion : FileX}
          title={
            filtersActive ? t('list.noResultsTitle') : t('common.noData')
          }
          description={
            filtersActive ? t('list.noResultsDescription') : t('officer.queueTitle')
          }
          action={
            filtersActive
              ? { label: t('list.clearFilters'), onClick: handleClearFilters }
              : undefined
          }
        />
      )}

      {/* Table — desktop */}
      {!loading && !error && data.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    field="application_number"
                    label={t('list.colApplicationNumber')}
                    current={sortByParam}
                    order={sortOrderParam}
                    onChange={handleSort}
                  />
                </TableHead>
                <TableHead>{t('officer.applicantName')}</TableHead>
                <TableHead>
                  <SortableHeader
                    field="building_type"
                    label={t('application.buildingType')}
                    current={sortByParam}
                    order={sortOrderParam}
                    onChange={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    field="current_stage"
                    label={t('list.colStage')}
                    current={sortByParam}
                    order={sortOrderParam}
                    onChange={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    field="status"
                    label={t('list.colStatus')}
                    current={sortByParam}
                    order={sortOrderParam}
                    onChange={handleSort}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader
                    field="ai_compliance_score"
                    label={t('officer.aiScore')}
                    current={sortByParam}
                    order={sortOrderParam}
                    onChange={handleSort}
                    className="justify-end"
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    field="submitted_at"
                    label={t('officer.submittedDate')}
                    current={sortByParam}
                    order={sortOrderParam}
                    onChange={handleSort}
                  />
                </TableHead>
                <TableHead className="text-right">{t('officer.daysPending')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((app) => {
                const days = daysSince(app.submitted_at);
                return (
                  <TableRow
                    key={app.id}
                    className={cn('cursor-pointer', urgencyBorder(days))}
                    onClick={() => router.push(`/officer/applications/${app.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/officer/applications/${app.id}`);
                      }
                    }}
                    role="link"
                    aria-label={`${t('list.colApplicationNumber')} ${app.application_number}`}
                  >
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/officer/applications/${app.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {app.application_number}
                      </Link>
                    </TableCell>
                    <TableCell>{getApplicantName(app, locale)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {getBuildingTypeLabel(app.building_type, locale)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StageBadge stage={app.current_stage} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-semibold tabular-nums', aiScoreColor(app.ai_compliance_score))}>
                        {app.ai_compliance_score === null || app.ai_compliance_score === undefined
                          ? '—'
                          : formatNumber(Math.round(app.ai_compliance_score))}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {app.submitted_at ? formatDate(app.submitted_at, locale) : '—'}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', daysPendingColor(days))}>
                      {days === null ? '—' : formatNumber(days)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Card view — mobile */}
      {!loading && !error && data.length > 0 && (
        <div className="space-y-3 md:hidden">
          {data.map((app) => {
            const days = daysSince(app.submitted_at);
            return (
              <Link
                key={app.id}
                href={`/officer/applications/${app.id}`}
                className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`${t('list.colApplicationNumber')} ${app.application_number}`}
              >
                <Card
                  className={cn(
                    'transition-colors hover:bg-muted/40',
                    urgencyBorder(days)
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {app.application_number}
                      </span>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-medium">
                        {getApplicantName(app, locale)}
                      </p>
                      <Badge variant="secondary" className="font-normal">
                        {getBuildingTypeLabel(app.building_type, locale)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StageBadge stage={app.current_stage} />
                      <span className={cn('text-sm font-semibold', aiScoreColor(app.ai_compliance_score))}>
                        {t('officer.aiScore')}:{' '}
                        {app.ai_compliance_score === null || app.ai_compliance_score === undefined
                          ? '—'
                          : formatNumber(Math.round(app.ai_compliance_score))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{app.submitted_at ? formatDate(app.submitted_at, locale) : '—'}</span>
                      <span className={daysPendingColor(days)}>
                        {days === null ? '—' : `${formatNumber(days)} ${t('officer.daysPending')}`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {t('list.showingRange', {
              start: formatNumber(rangeStart),
              end: formatNumber(rangeEnd),
              total: formatNumber(total),
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: String(pageParam - 1) })}
              disabled={pageParam <= 1}
              aria-label={t('common.previous')}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span
              className="text-sm font-medium"
              aria-live="polite"
            >
              {formatNumber(pageParam)} / {formatNumber(totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: String(pageParam + 1) })}
              disabled={pageParam >= totalPages}
              aria-label={t('common.next')}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
