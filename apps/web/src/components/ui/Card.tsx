import { forwardRef, type HTMLAttributes, type ElementType, type ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outline' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  as?: ElementType;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-[var(--color-border-default)] shadow-[var(--shadow-card)]',
  elevated: 'bg-white border border-[var(--color-border-default)] shadow-[var(--shadow-elevated)]',
  outline: 'bg-transparent border border-[var(--color-border-default)]',
  flat: 'bg-[var(--color-canvas-neutral)] border border-transparent',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    as: Component = 'div',
    variant = 'default',
    padding = 'md',
    interactive = false,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const interactiveClasses = interactive
    ? 'transition-all duration-200 hover:border-[var(--color-brand-primary)] hover:shadow-md cursor-pointer active:scale-[0.99]'
    : '';

  return (
    <Component
      ref={ref}
      className={`rounded-2xl overflow-hidden ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveClasses} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
});

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className = '', action, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={`flex items-start justify-between gap-4 pb-4 ${className}`} {...rest}>
      <div className="space-y-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { as: Component = 'h3', className = '', children, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={`text-lg font-bold tracking-tight text-[var(--color-text-primary)] ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
});

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className = '', children, ...rest }, ref) {
  return (
    <p ref={ref} className={`text-sm text-[var(--color-text-secondary)] ${className}`} {...rest}>
      {children}
    </p>
  );
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className = '', children, ...rest }, ref) {
    return (
      <div ref={ref} className={`space-y-4 ${className}`} {...rest}>
        {children}
      </div>
    );
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className = '', children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between gap-3 pt-4 border-t border-[var(--color-border-default)] mt-4 ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
