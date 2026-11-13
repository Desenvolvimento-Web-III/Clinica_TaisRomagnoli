import type { ReactNode } from 'react';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// 1. EmptyState
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

function DefaultEmptyIcon() {
  return (
    <svg
      className="h-10 w-10 text-[var(--color-icon-muted)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xs">
        {icon || <DefaultEmptyIcon />}
      </div>

      <h3 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. LoadingState
// ---------------------------------------------------------------------------

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  className?: string;
}

export function LoadingState({
  message = 'Carregando...',
  size = 'md',
  fullPage = false,
  className = '',
}: LoadingStateProps) {
  const spinnerSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';

  const containerClasses = fullPage
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="loading-state"
      className={`${containerClasses} ${className}`}
    >
      <svg
        className={`animate-spin text-[var(--color-brand-primary)] ${spinnerSize}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && (
        <p className="mt-3 text-sm font-medium text-[var(--color-text-secondary)]">{message}</p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ErrorState
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  description,
  onRetry,
  retryLabel = 'Tentar novamente',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-error-text)] shadow-xs">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
        </svg>
      </div>

      <h3 className="text-base font-bold text-[var(--color-error-text)]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">{description}</p>

      {onRetry && (
        <div className="mt-5">
          <Button variant="danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Skeleton
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const variantClasses =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rectangular'
        ? 'rounded-2xl'
        : 'rounded-md';

  const style: Record<string, string | number> = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      style={style}
      className={`animate-pulse bg-[var(--color-border-default)] ${variantClasses} ${
        !height && variant === 'text' ? 'h-4 w-full' : ''
      } ${className}`}
    />
  );
}
