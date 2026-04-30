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
  FileQuestion,
  FilePlus,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { ProgressBar } from '@/components/application/ProgressBar';
import { StageBadge } from '@/components/application/StageBadge';
import { StatusBadge } from '@/components/application/StatusBadge';
import { EmptyState } from '@/components/application/EmptyState';
import { useLocale } from '@/hooks/useLocale';
import { ITEMS_PER_PAGE, BUILDING_TYPES } from '@/lib/constants';
import { cn, formatDate, toBanglaNumerals } from '@/lib/utils';
import type { AppStatus, Application, BuildingType } from '@/types';

type SortField = 'submitted_at' | 'updated_at' | 'status';
type SortOrder = 'asc' | 'desc';

interface ApiResponse {
  data: Application[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_FILTERS: Array<{ key: string; value: AppStatus | 'all'; labelKey: string }> = [
  { key: 'all', value: 'all', labelKey: 'common.all' },
  { key: 'draft', value: 'draft', labelKey: 'status.draft' },
  { key: 'submitted', value: 'submitted', labelKey: 'status.submitted' },
  { key: 'under_review', value: 'under_review', labelKey: 'status.underReview' },
  { key: 'approved', value: 'approved', labelKey: 'status.approved' },
  { key: 'rejected', value: 'rejected', labelKey: 'status.rejected' },
];

function getBuildingTypeLabel(value: BuildingType, locale: 'bn' | 'en') {
  const meta = BUILDING_TYPES.find((b) => b.value === value);
  if (!meta) return value;
  return locale === 'bn' ? meta.labelBn : meta.labelEn;
}

function getProjectName(app: Application, locale: 'bn' | 'en'): string {
  const primary = locale === 'bn' ? app.project_name_bn : app.project_name_en;
  const secondary = locale === 'bn' ? app.project_name_en : app.project_name_bn;
  return primary || secondary || '—';
}

export function ApplicationList() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();

  const statusParam = (searchParams.get('status') as AppStatus | null) ?? null;
  const sortByParam = (searchParams.get('sortBy') as SortField | null) ?? 'submitted_at';
  const sortOrderParam = (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc';
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const [data, setData] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      qs.set('sortBy', sortByParam);
      qs.set('sortOrder', sortOrderParam);
      qs.set('page', String(pageParam));
      qs.set('limit', String(ITEMS_PER_PAGE));

      const res = await fetch(`/api/applications?${qs.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? 'Failed to load applications');
      }
      const payload = (json.data as ApiResponse) ?? null;
      if (!payload) throw new Error('Invalid response');
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
  }, [statusParam, sortByParam, sortOrderParam, pageParam, t]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filtersActive = !!statusParam;

  const rangeStart = total === 0 ? 0 : (pageParam - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(pageParam * ITEMS_PER_PAGE, total);

  const formatNumber = useCallback(
    (n: number) => (locale === 'bn' ? toBanglaNumerals(n) : String(n)),
    [locale]
  );

  const handleStatusFilter = (value: AppStatus | 'all') => {
    updateParams({
      status: value === 'all' ? null : value,
      page: '1',
    });
  };

  const handleSortField = (value: string) => {
    updateParams({ sortBy: value, page: '1' });
  };

  const handleSortOrderToggle = () => {
    updateParams({ sortOrder: sortOrderParam === 'asc' ? 'desc' : 'asc' });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page: String(page) });
  };

  const handleClearFilters = () => {
    updateParams({ status: null, page: '1' });
  };

  const sortOptions = useMemo(
    () => [
      { value: 'submitted_at', label: t('list.sortDateSubmitted') },
      { value: 'updated_at', label: t('list.sortLastUpdated') },
      { value: 'status', label: t('list.sortStatus') },
    ],
    [t]
  );

  const showEmptyAll = !loading && !error && total === 0 && !filtersActive;
  const showEmptyFiltered = !loading && !error && total === 0 && filtersActive;

  return (
    <div className="space-y-4">
      {/* Filter bar + sort + view toggle */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label={t('list.statusFilters')}
        >
          {STATUS_FILTERS.map((filter) => {
            const active =
              filter.value === 'all'
                ? !statusParam
                : statusParam === filter.value;
            return (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleStatusFilter(filter.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {t(filter.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={sortByParam} onValueChange={handleSortField}>
            <SelectTrigger className="h-9 w-[170px]" aria-label={t('common.sort')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSortOrderToggle}
            aria-label={
              sortOrderParam === 'asc' ? t('list.sortAscending') : t('list.sortDescending')
            }
            title={
              sortOrderParam === 'asc' ? t('list.sortAscending') : t('list.sortDescending')
            }
          >
            {sortOrderParam === 'asc' ? (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

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
              className="h-14 w-full animate-pulse rounded-md bg-muted/60"
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

      {/* Empty - no applications at all */}
      {showEmptyAll && (
        <EmptyState
          icon={FilePlus}
          title={t('list.emptyTitle')}
          description={t('list.emptyDescription')}
          action={{
            label: t('list.startFirstApplication'),
            href: '/owner/applications/new',
          }}
        />
      )}

      {/* Empty - filter has no results */}
      {showEmptyFiltered && (
        <EmptyState
          icon={FileQuestion}
          title={t('list.noResultsTitle')}
          description={t('list.noResultsDescription')}
          action={{
            label: t('list.clearFilters'),
            onClick: handleClearFilters,
          }}
        />
      )}

      {/* Data — Table view (desktop) */}
      {!loading && !error && data.length > 0 && (
        <div className="hidden rounded-lg border border-border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.colApplicationNumber')}</TableHead>
                <TableHead>{t('list.colProjectName')}</TableHead>
                <TableHead>{t('application.buildingType')}</TableHead>
                <TableHead>{t('list.colStage')}</TableHead>
                <TableHead>{t('list.colStatus')}</TableHead>
                <TableHead className="w-[160px]">{t('list.colProgress')}</TableHead>
                <TableHead>{t('list.colLastUpdated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/owner/applications/${app.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/owner/applications/${app.id}`);
                    }
                  }}
                  role="link"
                  aria-label={`${t('list.colApplicationNumber')} ${app.application_number}`}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/owner/applications/${app.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {app.application_number}
                    </Link>
                  </TableCell>
                  <TableCell>{getProjectName(app, locale)}</TableCell>
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
                  <TableCell>
                    <ProgressBar currentStage={app.current_stage} showLabel />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(app.updated_at, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Data — Card view (mobile) */}
      {!loading && !error && data.length > 0 && (
        <div className="space-y-3 md:hidden">
          {data.map((app) => (
            <Link
              key={app.id}
              href={`/owner/applications/${app.id}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
              aria-label={`${t('list.colApplicationNumber')} ${app.application_number}`}
            >
              <Card className="hover:bg-muted/40 transition-colors">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <span>{app.application_number}</span>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  <div className="space-y-1">
                    <p className="text-base font-medium leading-tight">
                      {getProjectName(app, locale)}
                    </p>
                    <Badge variant="secondary" className="font-normal">
                      {getBuildingTypeLabel(app.building_type, locale)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <StageBadge stage={app.current_stage} />
                    <ProgressBar currentStage={app.current_stage} showLabel />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('list.lastUpdated')}: {formatDate(app.updated_at, locale)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
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
              onClick={() => handlePageChange(pageParam - 1)}
              disabled={pageParam <= 1}
              aria-label={t('common.previous')}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only-mobile">{t('common.previous')}</span>
            </Button>
            <span
              className="text-sm font-medium"
              aria-live="polite"
              aria-label={`${t('common.page')} ${formatNumber(pageParam)} ${t('common.of')} ${formatNumber(totalPages)}`}
            >
              {formatNumber(pageParam)} / {formatNumber(totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageParam + 1)}
              disabled={pageParam >= totalPages}
              aria-label={t('common.next')}
            >
              <span className="sr-only-mobile">{t('common.next')}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
