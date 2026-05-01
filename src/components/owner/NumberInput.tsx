'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NumberInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type' | 'min' | 'max' | 'step'> {
  value: number | string | null | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  buttonsLabels?: { increment: string; decrement: string };
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      value,
      onChange,
      onBlur,
      min,
      max,
      step = 1,
      className,
      ariaLabel,
      buttonsLabels = { increment: 'Increment', decrement: 'Decrement' },
      ...rest
    },
    ref
  ) {
    const stringValue =
      value === null || value === undefined ? '' : String(value);

    const adjust = (delta: number) => {
      const current = stringValue === '' ? 0 : Number(stringValue);
      if (Number.isNaN(current)) return;
      let next = current + delta;
      if (typeof min === 'number' && next < min) next = min;
      if (typeof max === 'number' && next > max) next = max;
      onChange(String(next));
    };

    return (
      <div className={cn('flex items-stretch gap-1', className)}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => adjust(-step)}
          aria-label={buttonsLabels.decrement}
          tabIndex={-1}
          className="h-9 w-9 shrink-0"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Input
          ref={ref}
          type="number"
          inputMode="decimal"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          min={min}
          max={max}
          step={step}
          aria-label={ariaLabel}
          className="text-center"
          {...rest}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => adjust(step)}
          aria-label={buttonsLabels.increment}
          tabIndex={-1}
          className="h-9 w-9 shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }
);
