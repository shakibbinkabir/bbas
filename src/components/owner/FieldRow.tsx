'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldRowProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  helper?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldRow({
  id,
  label,
  required,
  helper,
  error,
  children,
  className,
}: FieldRowProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        <span>{label}</span>
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
