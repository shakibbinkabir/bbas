'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ marginTop: '0.75rem', color: '#6b7280' }}>
              {error.digest ? `Reference: ${error.digest}` : 'Please try again.'}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1.25rem',
                background: '#0f9d58',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
