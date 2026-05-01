import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const STORAGE_BUCKET = 'application-documents';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let parser: { destroy(): Promise<void> } | null = null;
  try {
    const { PDFParse } = await import('pdf-parse');
    const data = new Uint8Array(buffer.byteLength);
    data.set(buffer);
    parser = new PDFParse({ data });
    const result = await (parser as InstanceType<typeof PDFParse>).getText();
    return result.text || '';
  } catch (error) {
    // Graceful degradation — scoring still works on metadata if extraction fails.
    // eslint-disable-next-line no-console
    console.error('PDF text extraction failed:', error);
    return '';
  } finally {
    if (parser) await parser.destroy().catch(() => undefined);
  }
}

export async function extractDocumentText(
  supabase: SupabaseClient<Database>,
  filePath: string,
  mimeType: string | null
): Promise<string> {
  if (mimeType !== 'application/pdf') return '';

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(filePath);
  if (error || !data) return '';

  const buffer = Buffer.from(await data.arrayBuffer());
  return extractTextFromPDF(buffer);
}
