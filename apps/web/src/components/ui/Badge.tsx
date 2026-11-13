import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'neutral' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  brand:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] border border-transparent font-medium',
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)] font-medium',
  warning:
    'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)] font-medium',
  error:
    'bg-[var(--color-error-bg)] text-[var(--color-error-text)] border border-[var(--color-error-border)] font-medium',
  neutral:
    'bg-[var(--color-canvas-neutral)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)] font-medium',
  outline:
    'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border-default)] font-medium',
};

const dotColors: Record<BadgeVariant, string> = {
  brand: 'bg-[var(--color-brand-primary)]',
  success: 'bg-[var(--color-success-text)]',
  warning: 'bg-[var(--color-warning-text)]',
  error: 'bg-[var(--color-error-text)]',
  neutral: 'bg-[var(--color-icon-muted)]',
  outline: 'bg-[var(--color-icon-muted)]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-full gap-1',
  md: 'px-2.5 py-1 text-xs rounded-full gap-1.5',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  children,
  className = '',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium leading-none select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
      )}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
