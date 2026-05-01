'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/application/EmptyState';
import { useLocale } from '@/hooks/useLocale';
import { cn, formatDate, toBanglaNumerals } from '@/lib/utils';
import type { UserProfile } from '@/types';

type SortField = 'full_name_en' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface OfficerRow extends UserProfile {
  assigned_count?: number;
}

interface ManageOfficersClientProps {
  currentUserId: string;
}

interface FormState {
  fullNameEn: string;
  fullNameBn: string;
  email: string;
  phone: string;
}

const INITIAL_FORM: FormState = {
  fullNameEn: '',
  fullNameBn: '',
  email: '',
  phone: '',
};

export function ManageOfficersClient({ currentUserId }: ManageOfficersClientProps) {
  const t = useTranslations();
  const { locale } = useLocale();

  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pendingDeactivate, setPendingDeactivate] = useState<OfficerRow | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const formatNumber = useCallback(
    (n: number) => (locale === 'bn' ? toBanglaNumerals(n) : String(n)),
    [locale]
  );

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (searchValue) qs.set('search', searchValue);
      qs.set('sortBy', sortField);
      qs.set('sortOrder', sortOrder);
      qs.set('limit', '100');

      const res = await fetch(`/api/users/officers?${qs.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? t('manageOfficers.errorLoad'));
      }
      const list = (json.data?.data as OfficerRow[]) ?? [];
      setOfficers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('manageOfficers.errorLoad'));
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }, [searchValue, sortField, sortOrder, t]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchValue(searchInput.trim());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const openDialog = () => {
    setForm(INITIAL_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fullNameEn = form.fullNameEn.trim();
    const fullNameBn = form.fullNameBn.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (
      fullNameEn.length < 3 ||
      fullNameBn.length < 3 ||
      !email ||
      !phone
    ) {
      setFormError(t('errors.required'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users/officers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullNameEn, fullNameBn, email, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? t('manageOfficers.errorCreate'));
      }
      toast.success(t('manageOfficers.officerCreated'));
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      await fetchOfficers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('manageOfficers.errorCreate');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!pendingDeactivate) return;
    const target = pendingDeactivate;
    setDeactivating(true);
    try {
      const res = await fetch(
        `/api/users/officers/${target.id}/deactivate`,
        { method: 'PUT', credentials: 'include' }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? t('manageOfficers.errorUpdate'));
      }
      const updated = json.data as OfficerRow;
      toast.success(
        updated.is_active
          ? t('manageOfficers.officerActivated')
          : t('manageOfficers.officerDeactivated')
      );
      setPendingDeactivate(null);
      await fetchOfficers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('manageOfficers.errorUpdate'));
    } finally {
      setDeactivating(false);
    }
  };

  const sortedOfficers = useMemo(() => officers, [officers]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <form onSubmit={onSearchSubmit} role="search" className="flex-1">
            <Label
              htmlFor="officer-search"
              className="text-xs font-medium text-muted-foreground"
            >
              {t('common.search')}
            </Label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="officer-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('manageOfficers.searchPlaceholder')}
                type="search"
                className="pl-9"
              />
            </div>
          </form>
          <Button type="button" onClick={openDialog} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('manageOfficers.addOfficer')}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-2" role="status" aria-live="polite">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 w-full animate-pulse rounded-md bg-muted/60"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && sortedOfficers.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title={
            searchValue
              ? t('manageOfficers.noResults')
              : t('manageOfficers.noOfficers')
          }
          description={
            searchValue ? undefined : t('manageOfficers.noOfficersDesc')
          }
          action={
            searchValue
              ? undefined
              : {
                  label: t('manageOfficers.addOfficer'),
                  onClick: openDialog,
                }
          }
        />
      )}

      {!loading && !error && sortedOfficers.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader
                      field="full_name_en"
                      label={t('manageOfficers.colName')}
                      current={sortField}
                      order={sortOrder}
                      onChange={handleSort}
                    />
                  </TableHead>
                  <TableHead>{t('manageOfficers.colEmail')}</TableHead>
                  <TableHead>{t('manageOfficers.colPhone')}</TableHead>
                  <TableHead>{t('manageOfficers.colStatus')}</TableHead>
                  <TableHead className="text-right">
                    {t('manageOfficers.colAssigned')}
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      field="created_at"
                      label={t('manageOfficers.colCreated')}
                      current={sortField}
                      order={sortOrder}
                      onChange={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    {t('manageOfficers.colActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOfficers.map((o) => {
                  const displayName =
                    (locale === 'bn' ? o.full_name_bn : o.full_name_en) ||
                    o.full_name_en ||
                    o.full_name_bn ||
                    o.email ||
                    o.phone;
                  const isSelf = o.id === currentUserId;
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName}</span>
                          {o.role === 'admin' && (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                              {t('profile.roleAdmin')}
                            </Badge>
                          )}
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">
                              {t('manageOfficers.you')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.phone}
                      </TableCell>
                      <TableCell>
                        <StatusPill active={o.is_active} t={t} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(o.assigned_count ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(o.created_at, locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant={o.is_active ? 'destructive' : 'default'}
                            onClick={() => setPendingDeactivate(o)}
                            className="gap-1"
                          >
                            {o.is_active ? (
                              <>
                                <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('manageOfficers.deactivate')}
                              </>
                            ) : (
                              <>
                                <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('manageOfficers.reactivate')}
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {sortedOfficers.map((o) => {
              const displayName =
                (locale === 'bn' ? o.full_name_bn : o.full_name_en) ||
                o.full_name_en ||
                o.full_name_bn ||
                o.email ||
                o.phone;
              const isSelf = o.id === currentUserId;
              return (
                <Card key={o.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-semibold">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.email ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.phone}
                        </p>
                      </div>
                      <StatusPill active={o.is_active} t={t} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {t('manageOfficers.colAssigned')}:{' '}
                        {formatNumber(o.assigned_count ?? 0)}
                      </span>
                      <span>{formatDate(o.created_at, locale)}</span>
                    </div>
                    {!isSelf && (
                      <Button
                        type="button"
                        size="sm"
                        variant={o.is_active ? 'destructive' : 'default'}
                        onClick={() => setPendingDeactivate(o)}
                        className="w-full gap-1"
                      >
                        {o.is_active
                          ? t('manageOfficers.deactivate')
                          : t('manageOfficers.reactivate')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add officer dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next) closeDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('manageOfficers.addOfficerTitle')}</DialogTitle>
            <DialogDescription>
              {t('manageOfficers.addOfficerDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="officer-name-en">
                {t('manageOfficers.fullNameEn')}
              </Label>
              <Input
                id="officer-name-en"
                value={form.fullNameEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullNameEn: e.target.value }))
                }
                required
                minLength={3}
                maxLength={255}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="officer-name-bn">
                {t('manageOfficers.fullNameBn')}
              </Label>
              <Input
                id="officer-name-bn"
                value={form.fullNameBn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullNameBn: e.target.value }))
                }
                required
                minLength={3}
                maxLength={255}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="officer-email">
                {t('manageOfficers.email')}
              </Label>
              <Input
                id="officer-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="officer-phone">
                {t('manageOfficers.phone')}
              </Label>
              <Input
                id="officer-phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder={t('auth.phonePlaceholder')}
                required
                disabled={submitting}
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {submitting
                  ? t('manageOfficers.creating')
                  : t('manageOfficers.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm deactivate / reactivate */}
      <Dialog
        open={!!pendingDeactivate}
        onOpenChange={(next) => {
          if (!next && !deactivating) setPendingDeactivate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingDeactivate?.is_active
                ? t('manageOfficers.deactivate')
                : t('manageOfficers.reactivate')}
            </DialogTitle>
            <DialogDescription>
              {pendingDeactivate?.is_active
                ? t('manageOfficers.deactivateConfirm')
                : t('manageOfficers.reactivateConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeactivate(null)}
              disabled={deactivating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant={pendingDeactivate?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
              disabled={deactivating}
              className="gap-2"
            >
              {deactivating && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {pendingDeactivate?.is_active
                ? t('manageOfficers.deactivate')
                : t('manageOfficers.reactivate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  current: SortField;
  order: SortOrder;
  onChange: (field: SortField) => void;
}

function SortableHeader({
  field,
  label,
  current,
  order,
  onChange,
}: SortableHeaderProps) {
  const active = current === field;
  return (
    <button
      type="button"
      onClick={() => onChange(field)}
      className={cn(
        'inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
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

function StatusPill({
  active,
  t,
}: {
  active: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-green-500' : 'bg-slate-400'
        )}
        aria-hidden="true"
      />
      {active ? t('manageOfficers.active') : t('manageOfficers.inactive')}
    </span>
  );
}
