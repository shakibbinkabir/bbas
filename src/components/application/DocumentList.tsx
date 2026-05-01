'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/useLocale';
import { DOCUMENT_TYPES, type DocumentTypeMeta } from '@/lib/constants';
import { formatFileSize } from '@/lib/documents/validation';
import { getUploadAdapter } from '@/lib/documents/upload-adapter';
import { cn } from '@/lib/utils';
import type {
  BuildingType,
  DocumentMeta,
  DocumentType,
  UploadStatus,
} from '@/types';
import { DocumentPreview } from './DocumentPreview';
import { DocumentUploader } from './DocumentUploader';

interface DocumentListProps {
  applicationId: string;
  documents: DocumentMeta[];
  mode: 'owner' | 'officer';
  editable: boolean;
  buildingType: BuildingType;
  onDocumentChange?: () => void;
  className?: string;
}

interface RowData {
  meta: DocumentTypeMeta;
  doc?: DocumentMeta;
  /** Extra documents of the same type (the user uploaded more than one). */
  extras: DocumentMeta[];
}

/**
 * DocumentList — groups documents into Required / Optional buckets based on
 * `buildingType`, and renders an upload slot or uploaded card per type.
 * Supports both owner and officer modes. (Stage 4 / Task 4.6)
 */
export function DocumentList({
  applicationId,
  documents,
  mode,
  editable,
  buildingType,
  onDocumentChange,
  className,
}: DocumentListProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { toast } = useToast();

  const localized = useCallback(
    (m: { labelEn: string; labelBn: string }) =>
      locale === 'bn' ? m.labelBn : m.labelEn,
    [locale]
  );

  const { required, optional, untyped } = useMemo(() => {
    const reqRows: RowData[] = [];
    const optRows: RowData[] = [];
    const seen = new Set<DocumentType>();

    for (const meta of DOCUMENT_TYPES) {
      const matches = documents.filter((d) => d.document_type === meta.value);
      const [first, ...rest] = matches;
      const row: RowData = { meta, doc: first, extras: rest };

      if (matches.length > 0) seen.add(meta.value);

      if (meta.requiredFor.includes(buildingType)) {
        reqRows.push(row);
      } else if (
        meta.optionalFor.includes(buildingType) ||
        matches.length > 0
      ) {
        optRows.push(row);
      }
    }

    // Documents whose type isn't in DOCUMENT_TYPES (defensive fallback).
    const untypedDocs = documents.filter(
      (d) => !DOCUMENT_TYPES.find((m) => m.value === d.document_type)
    );

    return { required: reqRows, optional: optRows, untyped: untypedDocs };
  }, [buildingType, documents]);

  // DocumentUploader has already removed the file via the adapter; the parent
  // just needs to refresh.
  const handleUploaderRemoved = useCallback(() => {
    onDocumentChange?.();
  }, [onDocumentChange]);

  // For "extra" documents and view-only rows, removal goes through here so the
  // adapter is called once.
  const handleAdapterRemove = useCallback(
    async (docId: string) => {
      try {
        await getUploadAdapter().remove(docId);
        onDocumentChange?.();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [onDocumentChange, t, toast]
  );

  const handleUploaded = useCallback(() => {
    onDocumentChange?.();
  }, [onDocumentChange]);

  const renderRow = (row: RowData, isRequired: boolean) => {
    const label = localized(row.meta);
    return (
      <DocumentRow
        key={row.meta.value}
        applicationId={applicationId}
        documentType={row.meta.value}
        label={label}
        required={isRequired}
        doc={row.doc}
        extras={row.extras}
        editable={editable}
        mode={mode}
        onUploadComplete={handleUploaded}
        onUploaderRemoved={handleUploaderRemoved}
        onAdapterRemove={handleAdapterRemove}
      />
    );
  };

  const empty =
    required.length === 0 &&
    optional.length === 0 &&
    untyped.length === 0;

  return (
    <div className={cn('space-y-6', className)}>
      {required.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {t('documents.requiredDocuments')}
            </h3>
            <Badge variant="outline" className="text-xs">
              {required.filter((r) => !!r.doc).length} / {required.length}
            </Badge>
          </header>
          <div className="space-y-3">
            {required.map((row) => renderRow(row, true))}
          </div>
        </section>
      )}

      {optional.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">
            {t('documents.optionalDocuments')}
          </h3>
          <div className="space-y-3">
            {optional.map((row) => renderRow(row, false))}
          </div>
        </section>
      )}

      {untyped.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">
            {t('documentType.other')}
          </h3>
          <div className="space-y-2">
            {untyped.map((doc) => (
              <UploadedRow
                key={doc.id}
                doc={doc}
                label={t('documentType.other')}
                editable={editable}
                mode={mode}
                onRemove={() => handleAdapterRemove(doc.id)}
              />
            ))}
          </div>
        </section>
      )}

      {empty && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('documents.noDocumentsYet')}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function DocumentRow({
  applicationId,
  documentType,
  label,
  required,
  doc,
  extras,
  editable,
  mode,
  onUploadComplete,
  onUploaderRemoved,
  onAdapterRemove,
}: {
  applicationId: string;
  documentType: DocumentType;
  label: string;
  required: boolean;
  doc?: DocumentMeta;
  extras: DocumentMeta[];
  editable: boolean;
  mode: 'owner' | 'officer';
  onUploadComplete: (doc: DocumentMeta) => void;
  onUploaderRemoved: (docId: string) => void;
  onAdapterRemove: (docId: string) => Promise<void>;
}) {
  if (editable) {
    return (
      <div className="space-y-2">
        <DocumentUploader
          applicationId={applicationId}
          documentType={documentType}
          label={label}
          required={required}
          existingDocument={doc ?? null}
          onUploadComplete={onUploadComplete}
          onRemove={onUploaderRemoved}
        />
        {extras.map((extra) => (
          <UploadedRow
            key={extra.id}
            doc={extra}
            label={label}
            editable
            mode={mode}
            onRemove={() => onAdapterRemove(extra.id)}
          />
        ))}
      </div>
    );
  }

  if (!doc) {
    return <MissingRow label={label} required={required} />;
  }
  return (
    <div className="space-y-2">
      <UploadedRow
        doc={doc}
        label={label}
        editable={false}
        mode={mode}
        onRemove={() => onAdapterRemove(doc.id)}
      />
      {extras.map((extra) => (
        <UploadedRow
          key={extra.id}
          doc={extra}
          label={label}
          editable={false}
          mode={mode}
          onRemove={() => onAdapterRemove(extra.id)}
        />
      ))}
    </div>
  );
}

function MissingRow({ label, required }: { label: string; required: boolean }) {
  const t = useTranslations();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge
        variant="outline"
        className={cn(
          'border-transparent text-xs',
          required
            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
        )}
      >
        {required ? t('documents.missing') : t('documents.optional')}
      </Badge>
    </div>
  );
}

function UploadedRow({
  doc,
  label,
  editable,
  mode,
  onRemove,
}: {
  doc: DocumentMeta;
  label: string;
  editable: boolean;
  mode: 'owner' | 'officer';
  onRemove: () => void | Promise<void>;
}) {
  const t = useTranslations();
  const { toast } = useToast();
  const [removing, setRemoving] = useSafeState(false);

  const isImage = (doc.mime_type ?? '').startsWith('image/');
  const Icon = isImage ? ImageIcon : FileText;

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <UploadStatusBadge status={doc.upload_status} />
            {mode === 'officer' && doc.ai_score !== null && doc.ai_score !== undefined && (
              <Badge
                variant="outline"
                className="border-transparent bg-blue-100 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
              >
                {t('documents.aiScore')}: {doc.ai_score}
              </Badge>
            )}
          </div>
          <p
            className="truncate text-xs text-muted-foreground"
            title={doc.file_name}
          >
            {doc.file_name} · {formatFileSize(doc.file_size_bytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DocumentPreview
            documentId={doc.id}
            fileName={doc.file_name}
            mimeType={doc.mime_type ?? 'application/octet-stream'}
            triggerLabel={t('documents.previewFile')}
          />
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('common.remove')}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                t('common.remove')
              )}
            </Button>
          )}
        </div>
      </div>

      {doc.officer_remarks && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100">
          <CircleAlert className="h-4 w-4" aria-hidden="true" />
          <AlertTitle className="text-sm font-semibold">
            {t('documents.officerRemarks')}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {doc.officer_remarks}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function UploadStatusBadge({ status }: { status: UploadStatus }) {
  const t = useTranslations();
  const config: Record<
    UploadStatus,
    { className: string; Icon: typeof CircleCheck; label: string }
  > = {
    uploading: {
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      Icon: Loader2,
      label: t('documents.uploading'),
    },
    uploaded: {
      className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      Icon: CircleCheck,
      label: t('documents.uploaded'),
    },
    verified: {
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
      Icon: CircleCheck,
      label: t('documents.verified'),
    },
    rejected: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      Icon: CircleX,
      label: t('documents.rejected'),
    },
  };
  const c = config[status] ?? config.uploaded;
  const Icon = c.Icon;
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent text-xs', c.className)}
    >
      <Icon
        className={cn(
          'mr-1 h-3 w-3',
          status === 'uploading' && 'animate-spin'
        )}
        aria-hidden="true"
      />
      {c.label}
    </Badge>
  );
}

// Tiny inline `useState` shim that ignores updates after unmount. Avoids the
// React warning when an async remove resolves after the row is gone.
function useSafeState<T>(initial: T) {
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  const [value, setValue] = useState<T>(initial);
  const safeSet = useCallback((next: T) => {
    if (mounted.current) setValue(next);
  }, []);
  return [value, safeSet] as const;
}
