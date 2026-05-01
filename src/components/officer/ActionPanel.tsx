'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowRight,
  ArrowLeft,
  Award,
  MessageSquare,
  ShieldX,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/useLocale';
import { cn, getStageNameByNumber, toBanglaNumerals } from '@/lib/utils';
import type { Application, UserProfile } from '@/types';

interface ActionPanelProps {
  application: Application;
  currentUser: UserProfile;
}

interface OfficerOption {
  id: string;
  full_name_en: string | null;
  full_name_bn: string | null;
  role: string;
}

type ActionDialog = 'advance' | 'return' | 'reject' | 'approve' | null;

function officerName(o: OfficerOption | UserProfile, locale: 'bn' | 'en'): string {
  const en = o.full_name_en;
  const bn = o.full_name_bn;
  return (locale === 'bn' ? bn || en : en || bn) || 'Officer';
}

export function ActionPanel({ application, currentUser }: ActionPanelProps) {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = useLocale();

  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [note, setNote] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const [officers, setOfficers] = useState<OfficerOption[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isStage9 = application.current_stage >= 9;
  const isTerminal =
    application.status === 'approved' || application.status === 'rejected';

  const stageNumber = locale === 'bn'
    ? toBanglaNumerals(application.current_stage)
    : String(application.current_stage);
  const stageName = getStageNameByNumber(application.current_stage, locale);

  // Load officer list lazily for the reassignment dropdown.
  useEffect(() => {
    if (!isAdmin || !reassignOpen || officers.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workflow/assign', { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? t('common.error'));
        if (!cancelled) setOfficers((json.data as OfficerOption[]) ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('common.error'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, reassignOpen, officers.length, t]);

  function openDialog(d: ActionDialog) {
    setComment('');
    setReason('');
    setDialog(d);
  }

  async function handleAdvance() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflow/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: application.id,
          comment: comment.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      const nextStage = json?.data?.current_stage ?? application.current_stage + 1;
      const stageLabel = locale === 'bn' ? toBanglaNumerals(nextStage) : String(nextStage);
      toast.success(t('officer.appAdvanced', { stage: stageLabel }));
      setDialog(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn() {
    if (comment.trim().length < 20) {
      toast.error(t('officer.commentTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflow/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: application.id,
          comment: comment.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      toast.success(t('officer.appReturned'));
      setDialog(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error(t('officer.rejectionReasonRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflow/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: application.id,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      toast.success(t('officer.appRejected'));
      setDialog(null);
      router.push('/officer/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: application.id,
          comment: comment.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      toast.success(t('officer.appApproved'));
      setDialog(null);
      router.push('/officer/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!note.trim()) return;
    setNoteSubmitting(true);
    try {
      const res = await fetch('/api/workflow/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: application.id,
          comment: note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      toast.success(t('officer.noteAdded'));
      setNote('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setNoteSubmitting(false);
    }
  }

  async function handleReassign() {
    if (!reassignTarget) return;
    setReassignSubmitting(true);
    try {
      const res = await fetch('/api/workflow/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationId: application.id,
          officerId: reassignTarget,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      toast.success(t('officer.officerReassigned'));
      setReassignOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setReassignSubmitting(false);
    }
  }

  return (
    <Card className="md:sticky md:top-4">
      <CardContent className="space-y-5 p-5">
        {/* Stage display */}
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('officer.currentStage')}
          </p>
          <div
            className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold',
              'bg-primary text-primary-foreground'
            )}
            aria-hidden="true"
          >
            {stageNumber}
          </div>
          <p className="text-base font-semibold">{stageName}</p>
          <p className="text-xs text-muted-foreground">
            {t('officer.stageOf', {
              current: stageNumber,
              total: locale === 'bn' ? toBanglaNumerals(9) : '9',
            })}
          </p>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            type="button"
            className="w-full justify-center gap-2"
            onClick={() => openDialog('advance')}
            disabled={isStage9 || isTerminal}
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {t('officer.advance')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
            onClick={() => openDialog('return')}
            disabled={isTerminal}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('officer.return')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full justify-center gap-2"
            onClick={() => openDialog('reject')}
            disabled={isTerminal}
          >
            <ShieldX className="h-4 w-4" aria-hidden="true" />
            {t('officer.reject')}
          </Button>
          {isAdmin && isStage9 && !isTerminal && (
            <Button
              type="button"
              className="w-full justify-center gap-2 bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => openDialog('approve')}
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              {t('officer.approve')}
            </Button>
          )}
        </div>

        <Separator />

        {/* Internal notes */}
        <div className="space-y-2">
          <label htmlFor="internal-note" className="text-sm font-medium">
            {t('officer.internalNotes')}
          </label>
          <Textarea
            id="internal-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('officer.notePlaceholder')}
            rows={3}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleAddNote}
            disabled={noteSubmitting || !note.trim()}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {t('officer.addNote')}
          </Button>
        </div>

        {/* Assignment (admin only) */}
        {isAdmin && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('officer.assignedTo')}</p>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="truncate">
                  {application.assigned_officer
                    ? officerName(application.assigned_officer, locale)
                    : t('officer.unassigned')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => setReassignOpen(true)}
                >
                  <UserCog className="h-4 w-4" aria-hidden="true" />
                  {t('officer.reassign')}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Advance dialog */}
      <Dialog open={dialog === 'advance'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('officer.advanceConfirm')}</DialogTitle>
            <DialogDescription>{t('officer.advanceConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('officer.notePlaceholder')}
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdvance} disabled={submitting}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return dialog */}
      <Dialog open={dialog === 'return'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('officer.returnConfirm')}</DialogTitle>
            <DialogDescription>{t('officer.returnConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('officer.notePlaceholder')}
            rows={4}
            required
            minLength={20}
          />
          <p className="text-xs text-muted-foreground">
            {comment.trim().length}/20
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReturn}
              disabled={submitting || comment.trim().length < 20}
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={dialog === 'reject'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('officer.rejectConfirm')}</DialogTitle>
            <DialogDescription>{t('officer.rejectConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('officer.rejectionReason')}
            rows={4}
            required
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !reason.trim()}
            >
              {t('officer.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve dialog */}
      <Dialog open={dialog === 'approve'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('officer.approveConfirm')}</DialogTitle>
            <DialogDescription>{t('officer.approveConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('officer.notePlaceholder')}
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {t('officer.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('officer.reassignTitle')}</DialogTitle>
          </DialogHeader>
          <Select value={reassignTarget} onValueChange={setReassignTarget}>
            <SelectTrigger>
              <SelectValue placeholder={t('officer.selectOfficer')} />
            </SelectTrigger>
            <SelectContent>
              {officers.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {officerName(o, locale)}
                  {o.role === 'admin' ? ` · ${t('profile.roleAdmin')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setReassignOpen(false)}
              disabled={reassignSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReassign}
              disabled={reassignSubmitting || !reassignTarget}
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
