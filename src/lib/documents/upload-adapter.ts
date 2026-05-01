/**
 * Document upload adapter.
 *
 * Stage 3 shipped the `mockUploadAdapter` (in-memory, used by the application
 * form before the document APIs were ready). Stage 4 adds the real
 * `supabaseUploadAdapter` which talks to the document management APIs.
 *
 * Consumers should always import the adapter via `getUploadAdapter()` so the
 * swap is a one-line change.
 */
import type { DocumentMeta, DocumentType, UploadStatus } from '@/types';

export interface UploadProgress {
  /** Bytes uploaded so far. */
  loaded: number;
  /** Total bytes. */
  total: number;
  /** Percent 0–100. */
  percent: number;
}

export interface UploadAdapter {
  /**
   * Upload a file for a given application + document type. Resolves with the
   * stored DocumentMeta. The optional `onProgress` callback fires while the
   * upload is in flight (mock fires synthetic progress).
   */
  upload(
    file: File,
    applicationId: string,
    documentType: DocumentType,
    onProgress?: (p: UploadProgress) => void
  ): Promise<DocumentMeta>;

  /** Remove a previously uploaded file. */
  remove(documentId: string): Promise<void>;

  /** Resolve a viewable URL for a stored file. */
  getUrl(documentId: string): Promise<string>;
}

// =============================================================================
// MOCK ADAPTER — Stage 3
// =============================================================================
const mockBlobUrls = new Map<string, string>();

function createMockMeta(
  file: File,
  applicationId: string,
  documentType: DocumentType
): DocumentMeta {
  const id = crypto.randomUUID();
  const filePath = `mock/${applicationId}/${documentType}/${file.name}`;
  // Hold onto a blob URL so the UI can render an image preview locally.
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      mockBlobUrls.set(id, URL.createObjectURL(file));
    } catch {
      /* SSR or non-browser env — ignore */
    }
  }
  const now = new Date().toISOString();
  return {
    id,
    application_id: applicationId,
    document_type: documentType,
    file_name: file.name,
    file_path: filePath,
    file_size_bytes: file.size,
    mime_type: file.type,
    upload_status: 'uploaded' satisfies UploadStatus,
    officer_remarks: null,
    ai_score: null,
    ai_findings: null,
    uploaded_at: now,
    updated_at: now,
  };
}

export const mockUploadAdapter: UploadAdapter = {
  async upload(file, applicationId, documentType, onProgress) {
    // Simulate progressive upload over ~1 second.
    const total = file.size || 1;
    if (onProgress) {
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const loaded = Math.round((total * i) / steps);
        onProgress({ loaded, total, percent: Math.round((loaded / total) * 100) });
      }
    } else {
      await new Promise((r) => setTimeout(r, 1000));
    }
    return createMockMeta(file, applicationId, documentType);
  },

  async remove(documentId) {
    const url = mockBlobUrls.get(documentId);
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
    mockBlobUrls.delete(documentId);
  },

  async getUrl(documentId) {
    return mockBlobUrls.get(documentId) ?? '#';
  },
};

// =============================================================================
// SUPABASE ADAPTER — Stage 4 (real implementation)
// =============================================================================

/**
 * Shape of the row returned by `POST /api/documents/register`. The handler
 * wraps it in `{ data: ... }` per the project's apiSuccess() convention.
 */
interface RegisteredDocumentRow {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  upload_status: UploadStatus;
  officer_remarks: string | null;
  ai_score: number | null;
  ai_findings: unknown;
  uploaded_at: string;
  updated_at: string;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as { data?: T };
  return (body && 'data' in body ? (body.data as T) : (body as T)) ?? (undefined as T);
}

/** PUT a file to a Supabase signed-upload URL with progress reporting. */
function putToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const total = file.size || 1;
        onProgress?.({ loaded: total, total, percent: 100 });
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

export const supabaseUploadAdapter: UploadAdapter = {
  async upload(file, applicationId, documentType, onProgress) {
    const urlRes = await fetch('/api/documents/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        documentType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
    });
    const { signedUrl, path } = await jsonOrThrow<{
      signedUrl: string;
      token: string;
      path: string;
    }>(urlRes);

    await putToSignedUrl(signedUrl, file, onProgress);

    const registerRes = await fetch('/api/documents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        documentType,
        fileName: file.name,
        filePath: path,
        fileSize: file.size,
        mimeType: file.type,
      }),
    });
    const row = await jsonOrThrow<RegisteredDocumentRow>(registerRes);
    return row as DocumentMeta;
  },

  async remove(documentId) {
    const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      await jsonOrThrow(res);
    }
  },

  async getUrl(documentId) {
    const res = await fetch(`/api/documents/${documentId}/download`);
    const { downloadUrl } = await jsonOrThrow<{ downloadUrl: string }>(res);
    return downloadUrl;
  },
};

// =============================================================================
// SELECTOR — Stage 3 used the mock; Stage 4 flips this to Supabase by default.
// =============================================================================
let activeAdapter: UploadAdapter = supabaseUploadAdapter;

export function getUploadAdapter(): UploadAdapter {
  return activeAdapter;
}

/** Test/integration hook — set the mock or a custom adapter when needed. */
export function setUploadAdapter(adapter: UploadAdapter): void {
  activeAdapter = adapter;
}
