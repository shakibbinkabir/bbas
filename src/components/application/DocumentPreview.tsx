'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getUploadAdapter } from '@/lib/documents/upload-adapter';
import { cn } from '@/lib/utils';

interface DocumentPreviewProps {
  documentId: string;
  fileName: string;
  mimeType: string;
  /**
   * Render a custom trigger element. If omitted a default outline button with
   * an eye icon is rendered.
   */
  triggerLabel?: string;
  className?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

/**
 * DocumentPreview — fetches a 1-hour signed URL on demand. Images open inside
 * a modal with click-to-zoom; PDFs open in a new browser tab. (Stage 4 / 4.7)
 */
export function DocumentPreview({
  documentId,
  fileName,
  mimeType,
  triggerLabel,
  className,
}: DocumentPreviewProps) {
  const t = useTranslations();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  const handlePreview = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const url = await getUploadAdapter().getUrl(documentId);
      if (!url) throw new Error('No URL returned');
      if (isImage) {
        setImageUrl(url);
        setZoom(1);
        setOpen(true);
      } else if (isPdf) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // Unknown — fall back to opening in new tab.
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [documentId, isImage, isPdf, loading, t, toast]);

  // Reset zoom whenever the modal closes.
  useEffect(() => {
    if (!open) setZoom(1);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePreview}
        disabled={loading}
        className={cn('gap-1', className)}
        aria-label={triggerLabel ?? t('common.view')}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{triggerLabel ?? t('common.view')}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{fileName}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('common.view')}: {fileName}
            </DialogDescription>
          </DialogHeader>

          {imageUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="min-w-[3rem] text-center text-sm tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/40">
                <div className="flex min-h-[20rem] items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={fileName}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: 'transform 120ms ease-out',
                    }}
                    className="max-w-full select-none"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
