import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

export function Logo({ href = '/', size = 'md', className }: LogoProps) {
  const square = (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm',
        SIZE_MAP[size]
      )}
    >
      BB
    </span>
  );

  const content = (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {square}
      <span className="font-semibold tracking-tight">BBAS</span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="BBAS home">
      {content}
    </Link>
  );
}
