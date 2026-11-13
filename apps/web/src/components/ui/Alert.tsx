import type { ReactNode } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; iconColor: string; titleColor: string }
> = {
  info: {
    container:
      'bg-[var(--color-info-bg)] text-[var(--color-info-text)] border-[var(--color-info-border)]',
    iconColor: 'text-[var(--color-info-text)]',
    titleColor: 'text-[var(--color-info-text)]',
  },
  success: {
    container:
      'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]',
    iconColor: 'text-[var(--color-success-text)]',
    titleColor: 'text-[var(--color-success-text)]',
  },
  warning: {
    container:
      'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]',
    iconColor: 'text-[var(--color-warning-text)]',
    titleColor: 'text-[var(--color-warning-text)]',
  },
  error: {
    container:
      'bg-[var(--color-error-bg)] text-[var(--color-error-text)] border-[var(--color-error-border)]',
    iconColor: 'text-[var(--color-error-text)]',
    titleColor: 'text-[var(--color-error-text)]',
  },
};

function DefaultAlertIcon({ variant }: Readonly<{ variant: AlertVariant }>) {
  if (variant === 'success') {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    );
  }

  if (variant === 'error') {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
    </svg>
  );
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  icon,
  className = '',
}: AlertProps) {
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  const styles = variantStyles[variant];

  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles.container} ${className}`}
    >
      <div className={`mt-0.5 shrink-0 ${styles.iconColor}`}>
        {icon || <DefaultAlertIcon variant={variant} />}
      </div>

      <div className="flex-1 space-y-1">
        {title && <p className={`font-semibold ${styles.titleColor}`}>{title}</p>}
        <div className="text-sm opacity-95 leading-relaxed">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar aviso"
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-md opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

