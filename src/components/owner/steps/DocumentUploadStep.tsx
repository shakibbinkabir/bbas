'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  getOptionalDocuments,
  getRequiredDocuments,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getUploadAdapter } from '@/lib/documents/upload-adapter';
import { useApplicationFormStore } from '@/store/applicationForm';
import { useLocale } from '@/hooks/useLocale';
import type {
  ApplicationFormValues,
} from '@/lib/forms/applicationFormSchema';
import type { BuildingType, DocumentMeta, DocumentType } from '@/types';

const ACCEPT_ATTR = ACCEPTED_FILE_TYPES.join(',');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentUploadCardProps {
  documentType: DocumentType;
  labelEn: string;
  labelBn: string;
  required: boolean;
  applicationId: string;
  uploaded?: DocumentMeta;
  onUploaded: (doc: DocumentMeta) => void;
  onRemove: (doc: DocumentMeta) => void;
}

function DocumentUploadCard({
  documentType,
  labelEn,
  labelBn,
  required,
  applicationId,
  uploaded,
  onUploaded,
  onRemove,
}: DocumentUploadCardProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = locale === 'bn' ? labelBn : labelEn;
  const isUploading = progress !== null;

  const validate = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
        return t('errors.invalidFileType');
      }
      if (file.size > MAX_FILE_SIZE) {
        return t('errors.fileTooLarge', { max: MAX_FILE_SIZE / 1024 / 1024 });
      }
      return null;
    },
    [t]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const errMsg = validate(file);
      if (errMsg) {
        setError(errMsg);
        toast({
          title: t('common.error'),
          description: errMsg,
          variant: 'destructive',
        });
        return;
      }
      setError(null);
      setProgress(0);
      try {
        const meta = await getUploadAdapter().upload(
          file,
          applicationId,
          documentType,
          (p) => setProgress(p.percent)
        );
        onUploaded(meta);
        toast({
          title: t('wizard.uploadSuccessTitle'),
          description: file.name,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('common.error');
        setError(msg);
        toast({
          title: t('common.error'),
          description: msg,
          variant: 'destructive',
        });
      } finally {
        setProgress(null);
      }
    },
    [validate, toast, t, applicationId, documentType, onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(async () => {
    if (!uploaded) return;
    await getUploadAdapter().remove(uploaded.id);
    onRemove(uploaded);
  }, [onRemove, uploaded]);

  const status: { label: string; tone: 'red' | 'green' | 'gray' } = uploaded
    ? required
      ? { label: t('wizard.statusRequiredUploaded'), tone: 'green' }
      : { label: t('wizard.statusOptionalUploaded'), tone: 'green' }
    : required
      ? { label: t('wizard.statusRequiredMissing'), tone: 'red' }
      : { label: t('wizard.statusOptional'), tone: 'gray' };

  const isImage = uploaded?.mime_type?.startsWith('image/');

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">
            {t('wizard.acceptedFormatsNote')}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0',
            status.tone === 'red' &&
              'border-destructive text-destructive bg-destructive/10',
            status.tone === 'green' &&
              'border-emerald-500 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300',
            status.tone === 'gray' &&
              'border-border text-muted-foreground'
          )}
        >
          {status.label}
        </Badge>
      </div>

      {!uploaded && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            'rounded-md border-2 border-dashed p-4 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20'
          )}
        >
          <Upload
            className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            {t('wizard.dropOrBrowse')}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={onFileChange}
            className="sr-only"
            aria-label={t('wizard.uploadFor', { name: label })}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {t('wizard.chooseFile')}
          </Button>
          {isUploading && (
            <div className="mt-3 space-y-1">
              <Progress value={progress ?? 0} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {progress ?? 0}%
              </p>
            </div>
          )}
          {error && (
            <p className="mt-2 text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {uploaded && (
        <div className="flex items-center gap-3 rounded-md bg-muted/30 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-background border border-border overflow-hidden">
            {isImage ? (
              <ImagePreview docId={uploaded.id} alt={uploaded.file_name} />
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{uploaded.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(uploaded.file_size_bytes ?? 0)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-1">
              {t('common.delete')}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}

function ImagePreview({ docId, alt }: { docId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getUploadAdapter()
      .getUrl(docId)
      .then((u) => {
        if (!cancelled) setSrc(u);
      });
    return () => {
      cancelled = true;
    };
  }, [docId]);
  if (!src || src === '#') {
    return <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  );
}

interface DocumentUploadStepProps {
  applicationId: string;
}

export function DocumentUploadStep({ applicationId }: DocumentUploadStepProps) {
  const t = useTranslations();
  const { watch } = useFormContext<ApplicationFormValues>();
  const buildingType = (watch('buildingType') ?? 'residential') as BuildingType;

  const documents = useApplicationFormStore((s) => s.documents);
  const addDocument = useApplicationFormStore((s) => s.addDocument);
  const removeDocumentById = useApplicationFormStore(
    (s) => s.removeDocumentById
  );

  const required = useMemo(
    () => getRequiredDocuments(buildingType),
    [buildingType]
  );
  const optional = useMemo(
    () => getOptionalDocuments(buildingType),
    [buildingType]
  );

  const docsByType = useMemo(() => {
    const map = new Map<DocumentType, DocumentMeta>();
    for (const d of documents) map.set(d.document_type, d);
    return map;
  }, [documents]);

  const missingRequired = required.filter((d) => !docsByType.has(d.value));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.step4Title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('wizard.step4Subtitle')}
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
          <p>
            {t('wizard.requiredDocsRemaining', {
              count: missingRequired.length,
            })}
          </p>
        </div>
      )}
      {missingRequired.length === 0 && required.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
          <p>{t('wizard.allRequiredUploaded')}</p>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('wizard.requiredDocsHeading')}
        </h3>
        {required.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('wizard.noRequiredDocs')}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {required.map((d) => (
              <DocumentUploadCard
                key={d.value}
                documentType={d.value}
                labelEn={d.labelEn}
                labelBn={d.labelBn}
                required
                applicationId={applicationId}
                uploaded={docsByType.get(d.value)}
                onUploaded={(meta) => addDocument(meta)}
                onRemove={(meta) => removeDocumentById(meta.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('wizard.optionalDocsHeading')}
        </h3>
        {optional.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('wizard.noOptionalDocs')}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {optional.map((d) => (
              <DocumentUploadCard
                key={d.value}
                documentType={d.value}
                labelEn={d.labelEn}
                labelBn={d.labelBn}
                required={false}
                applicationId={applicationId}
                uploaded={docsByType.get(d.value)}
                onUploaded={(meta) => addDocument(meta)}
                onRemove={(meta) => removeDocumentById(meta.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
