import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-strong)] active:bg-[var(--color-brand-deep)] shadow-sm',
  secondary:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] hover:bg-[#dfd7fa] active:bg-[#d0c4f5]',
  outline:
    'border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas-neutral)] hover:border-[var(--color-brand-primary)] active:bg-[#f1f5f9]',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)] active:bg-[#e2e8f0]',
  danger:
    'bg-[var(--color-error-bg)] text-[var(--color-error-text)] border border-[var(--color-error-border)] hover:bg-[#fee2e2] active:bg-[#fecaca]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-11 px-4 py-2.5 text-sm rounded-xl gap-2 font-medium',
  lg: 'min-h-12 px-6 py-3 text-base rounded-2xl gap-2.5 font-semibold',
};

function Spinner({ size }: Readonly<{ size: ButtonSize }>) {
  const spinnerSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <svg
      className={`animate-spin ${spinnerSize} text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled = false,
    className = '',
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  const widthStyle = fullWidth ? 'w-full' : 'w-auto';

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      className={`inline-flex items-center justify-center transition-all select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)] ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Spinner size={size} />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 min-h-8 p-1.5 rounded-lg',
  md: 'h-10 w-10 min-h-10 p-2 rounded-xl',
  lg: 'h-12 w-12 min-h-12 p-3 rounded-2xl',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    children,
    variant = 'ghost',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    type = 'button',
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isLoading ? 'true' : undefined}
      className={`inline-flex items-center justify-center transition-all select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)] ${variantStyles[variant]} ${iconSizeStyles[size]} ${className}`}
      {...rest}
    >
      {isLoading ? <Spinner size={size} /> : children}
    </button>
  );
});
