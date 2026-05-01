'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CloudUpload,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/constants';
import {
  formatFileSize,
  validateFileSize,
  validateFileType,
} from '@/lib/documents/validation';
import {
  getUploadAdapter,
  type UploadAdapter,
} from '@/lib/documents/upload-adapter';
import { cn } from '@/lib/utils';
import type { DocumentMeta, DocumentType } from '@/types';
import { DocumentPreview } from './DocumentPreview';

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; fileName: string; percent: number }
  | { kind: 'error'; message: string; fileName?: string };

interface DocumentUploaderProps {
  applicationId: string;
  documentType: DocumentType;
  /** Bilingual label provided by the parent (already locale-aware). */
  label: string;
  required: boolean;
  existingDocument?: DocumentMeta | null;
  onUploadComplete: (doc: DocumentMeta) => void;
  onRemove: (docId: string) => void;
  disabled?: boolean;
  /** Override the upload implementation (defaults to the active adapter). */
  adapter?: UploadAdapter;
  className?: string;
}

const ACCEPT_ATTR = ACCEPTED_FILE_TYPES.join(',');

/**
 * DocumentUploader — drag-and-drop, click-to-browse uploader for a single
 * document slot. Renders empty / progress / uploaded / error states and routes
 * uploads through the active UploadAdapter. (Stage 4 / Task 4.5)
 */
export function DocumentUploader({
  applicationId,
  documentType,
  label,
  required,
  existingDocument,
  onUploadComplete,
  onRemove,
  disabled = false,
  adapter,
  className,
}: DocumentUploaderProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const [isDragOver, setIsDragOver] = useState(false);
  const [removing, setRemoving] = useState(false);
  // Keep `lastFile` so the user can retry without re-selecting.
  const [lastFile, setLastFile] = useState<File | null>(null);

  const isUploaded = !!existingDocument;
  const isUploading = state.kind === 'uploading';

  useEffect(() => {
    // Whenever an upload completes, the parent passes a new existingDocument —
    // reset our internal state to idle.
    if (existingDocument && state.kind !== 'idle') {
      setState({ kind: 'idle' });
    }
  }, [existingDocument, state.kind]);

  const reportInvalid = useCallback(
    (message: string, fileName?: string) => {
      setState({ kind: 'error', message, fileName });
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: message,
      });
    },
    [t, toast]
  );

  const startUpload = useCallback(
    async (file: File) => {
      if (!validateFileType(file)) {
        reportInvalid(
          t('errors.invalidFileType'),
          file.name
        );
        return;
      }
      if (!validateFileSize(file)) {
        reportInvalid(
          t('errors.fileTooLarge', { max: MAX_FILE_SIZE / 1024 / 1024 }),
          file.name
        );
        return;
      }

      setLastFile(file);
      setState({ kind: 'uploading', fileName: file.name, percent: 0 });

      try {
        const impl = adapter ?? getUploadAdapter();
        const result = await impl.upload(file, applicationId, documentType, (p) => {
          setState((prev) =>
            prev.kind === 'uploading' ? { ...prev, percent: p.percent } : prev
          );
        });
        onUploadComplete(result);
        setState({ kind: 'idle' });
        setLastFile(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ kind: 'error', message, fileName: file.name });
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: message,
        });
      }
    },
    [adapter, applicationId, documentType, onUploadComplete, reportInvalid, t, toast]
  );

  const handleFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files);
      // Single-slot uploader — only honor the first file.
      void startUpload(arr[0]);
    },
    [startUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (disabled || isUploaded || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploaded || isUploading) return;
    handleFiles(e.dataTransfer.files);
  };

  const openFilePicker = () => {
    if (disabled || isUploaded || isUploading) return;
    inputRef.current?.click();
  };

  const handleRemove = useCallback(async () => {
    if (!existingDocument || removing) return;
    setRemoving(true);
    try {
      const impl = adapter ?? getUploadAdapter();
      await impl.remove(existingDocument.id);
      onRemove(existingDocument.id);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRemoving(false);
    }
  }, [adapter, existingDocument, onRemove, removing, t, toast]);

  const handleRetry = useCallback(() => {
    if (lastFile) {
      void startUpload(lastFile);
    } else {
      openFilePicker();
    }
  }, [lastFile, startUpload]);

  const handleCancel = useCallback(() => {
    // We don't yet plumb AbortSignal through the adapter — flagging the UI as
    // idle is the safest behavior since the network request will complete in
    // the background but the row will still register correctly.
    setState({ kind: 'idle' });
    toast({
      title: t('common.cancel'),
      description: t('common.cancel'),
    });
  }, [t, toast]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge
          variant="outline"
          className={cn(
            'border-transparent text-xs',
            required
              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
          )}
        >
          {required ? t('documents.required') : t('documents.optional')}
        </Badge>
      </div>

      {isUploaded && existingDocument ? (
        <UploadedCard
          doc={existingDocument}
          onRemove={handleRemove}
          removing={removing}
          disabled={disabled}
        />
      ) : isUploading ? (
        <ProgressCard
          fileName={state.fileName}
          percent={state.percent}
          onCancel={handleCancel}
        />
      ) : state.kind === 'error' ? (
        <ErrorCard
          message={state.message}
          fileName={state.fileName}
          onRetry={handleRetry}
        />
      ) : (
        <DropZone
          isDragOver={isDragOver}
          disabled={disabled}
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        // Reset value so selecting the same file twice still fires onChange.
        onClick={(e) => {
          (e.currentTarget as HTMLInputElement).value = '';
        }}
      />
    </div>
  );
}

// =============================================================================
// SUB-VIEWS
// =============================================================================

function DropZone(props: {
  isDragOver: boolean;
  disabled: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
}) {
  const t = useTranslations();
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(
        'group flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 px-4 py-6 text-center transition-colors',
        'hover:border-primary/60 hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        props.isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border'
      )}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      <CloudUpload
        className="h-8 w-8 text-muted-foreground group-hover:text-primary"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">{t('documents.uploadHint')}</p>
      <p className="text-xs text-muted-foreground">
        {t('documents.uploadConstraints', { max: MAX_FILE_SIZE / 1024 / 1024 })}
      </p>
    </button>
  );
}

function ProgressCard({
  fileName,
  percent,
  onCancel,
}: {
  fileName: string;
  percent: number;
  onCancel: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-2 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        <span className="flex-1 truncate text-sm font-medium">{fileName}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label={t('common.cancel')}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <Progress value={percent} />
      <div className="text-right text-xs tabular-nums text-muted-foreground">
        {percent}%
      </div>
    </div>
  );
}

function UploadedCard({
  doc,
  onRemove,
  removing,
  disabled,
}: {
  doc: DocumentMeta;
  onRemove: () => void;
  removing: boolean;
  disabled: boolean;
}) {
  const t = useTranslations();
  const isImage = (doc.mime_type ?? '').startsWith('image/');
  const Icon = isImage ? ImageIcon : FileText;
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium" title={doc.file_name}>
              {doc.file_name}
            </span>
            <Badge
              variant="outline"
              className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
            >
              <CircleCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              {t('documents.uploaded')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(doc.file_size_bytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DocumentPreview
            documentId={doc.id}
            fileName={doc.file_name}
            mimeType={doc.mime_type ?? 'application/octet-stream'}
            triggerLabel={t('common.view')}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled || removing}
            aria-label={t('common.delete')}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">{t('common.delete')}</span>
          </Button>
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

function ErrorCard({
  message,
  fileName,
  onRetry,
}: {
  message: string;
  fileName?: string;
  onRetry: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <CircleAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1">
          {fileName && (
            <p className="truncate text-sm font-medium">{fileName}</p>
          )}
          <p className="text-sm text-destructive">{message}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="shrink-0"
        >
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      </div>
    </div>
  );
}
