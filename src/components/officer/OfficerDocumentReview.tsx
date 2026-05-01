'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DocumentList } from '@/components/application/DocumentList';
import { useLocale } from '@/hooks/useLocale';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type { BuildingType, DocumentMeta } from '@/types';

interface OfficerDocumentReviewProps {
  applicationId: string;
  documents: DocumentMeta[];
  buildingType: BuildingType;
}

export function OfficerDocumentReview({
  applicationId,
  documents,
  buildingType,
}: OfficerDocumentReviewProps) {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = useLocale();

  return (
    <div className="space-y-6">
      <DocumentList
        applicationId={applicationId}
        documents={documents}
        mode="officer"
        editable={false}
        buildingType={buildingType}
        onDocumentChange={() => router.refresh()}
      />

      {documents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">{t('officer.documentRemarks')}</h3>
          <div className="space-y-3">
            {documents.map((doc) => (
              <RemarkRow
                key={doc.id}
                document={doc}
                locale={locale}
                onSaved={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RemarkRowProps {
  document: DocumentMeta;
  locale: 'bn' | 'en';
  onSaved: () => void;
}

function RemarkRow({ document, locale, onSaved }: RemarkRowProps) {
  const t = useTranslations();
  const [remarks, setRemarks] = useState(document.officer_remarks ?? '');
  const [saving, setSaving] = useState(false);

  const meta = DOCUMENT_TYPES.find((m) => m.value === document.document_type);
  const label = meta ? (locale === 'bn' ? meta.labelBn : meta.labelEn) : document.document_type;

  async function persist(nextStatus?: 'verified' | 'rejected') {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          remarks,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t('common.error'));
      toast.success(t('officer.remarksSaved'));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{label}</p>
            <p className="truncate text-xs text-muted-foreground" title={document.file_name}>
              {document.file_name}
            </p>
          </div>
        </div>
        <Separator />
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={t('officer.remarksPlaceholder')}
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/30"
            onClick={() => persist('verified')}
            disabled={saving}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t('officer.verify')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
            onClick={() => persist('rejected')}
            disabled={saving}
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {t('officer.rejectDoc')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => persist()}
            disabled={saving}
          >
            {t('officer.saveRemarks')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
