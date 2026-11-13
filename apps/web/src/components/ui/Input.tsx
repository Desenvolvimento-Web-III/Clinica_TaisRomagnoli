import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  helperText,
  required = false,
  id,
  children,
  className = '',
}: FormFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  const helperId = helperText && id ? `${id}-helper` : undefined;

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && id && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[var(--color-text-secondary)]"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-[var(--color-error-text)]">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--color-error-text)]">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[var(--color-nav-muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = true,
    id: explicitId,
    required = false,
    className = '',
    disabled = false,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = explicitId || (label ? `input-${generatedId}` : undefined);
  const errorId = error && id ? `${id}-error` : undefined;
  const helperId = helperText && id ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const hasError = Boolean(error);
  const paddingLeft = leftIcon ? 'pl-11' : 'pl-3.5';
  const paddingRight = rightIcon ? 'pr-11' : 'pr-3.5';

  const inputElement = (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-auto'}`}>
      {leftIcon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-icon-muted)]">
          {leftIcon}
        </div>
      )}

      <input
        ref={ref}
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 w-full rounded-xl border bg-white py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] disabled:cursor-not-allowed disabled:bg-[var(--color-canvas-neutral)] disabled:text-[var(--color-nav-muted)] focus:outline-none ${paddingLeft} ${paddingRight} ${
          hasError
            ? 'border-[var(--color-error-border)] focus:border-[var(--color-error-border)] focus:ring-2 focus:ring-[var(--color-error-bg)]'
            : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-soft)]'
        } ${className}`}
        {...rest}
      />

      {rightIcon && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-icon-muted)]">
          {rightIcon}
        </div>
      )}
    </div>
  );

  if (label || error || helperText) {
    return (
      <FormField label={label} error={error} helperText={helperText} required={required} id={id}>
        {inputElement}
      </FormField>
    );
  }

  return inputElement;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    helperText,
    fullWidth = true,
    id: explicitId,
    required = false,
    className = '',
    disabled = false,
    rows = 4,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = explicitId || (label ? `textarea-${generatedId}` : undefined);
  const errorId = error && id ? `${id}-error` : undefined;
  const helperId = helperText && id ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const hasError = Boolean(error);

  const textareaElement = (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      required={required}
      disabled={disabled}
      aria-invalid={hasError ? 'true' : undefined}
      aria-describedby={describedBy}
      className={`w-full rounded-xl border bg-white p-3.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] disabled:cursor-not-allowed disabled:bg-[var(--color-canvas-neutral)] disabled:text-[var(--color-nav-muted)] focus:outline-none ${
        fullWidth ? 'w-full' : 'w-auto'
      } ${
        hasError
          ? 'border-[var(--color-error-border)] focus:border-[var(--color-error-border)] focus:ring-2 focus:ring-[var(--color-error-bg)]'
          : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-soft)]'
      } ${className}`}
      {...rest}
    />
  );

  if (label || error || helperText) {
    return (
      <FormField label={label} error={error} helperText={helperText} required={required} id={id}>
        {textareaElement}
      </FormField>
    );
  }

  return textareaElement;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    helperText,
    fullWidth = true,
    id: explicitId,
    required = false,
    className = '',
    disabled = false,
    children,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = explicitId || (label ? `select-${generatedId}` : undefined);
  const errorId = error && id ? `${id}-error` : undefined;
  const helperId = helperText && id ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const hasError = Boolean(error);

  const selectElement = (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-auto'}`}>
      <select
        ref={ref}
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 w-full appearance-none rounded-xl border bg-white py-2.5 pl-3.5 pr-10 text-sm text-[var(--color-text-primary)] transition-colors disabled:cursor-not-allowed disabled:bg-[var(--color-canvas-neutral)] disabled:text-[var(--color-nav-muted)] focus:outline-none ${
          hasError
            ? 'border-[var(--color-error-border)] focus:border-[var(--color-error-border)] focus:ring-2 focus:ring-[var(--color-error-bg)]'
            : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-soft)]'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-icon-muted)]">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  if (label || error || helperText) {
    return (
      <FormField label={label} error={error} helperText={helperText} required={required} id={id}>
        {selectElement}
      </FormField>
    );
  }

  return selectElement;
});
