import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-lumina-600 text-white hover:bg-lumina-500 active:bg-lumina-700 shadow-sm':
            variant === 'primary',
          'bg-surface-3 text-text border border-border hover:bg-surface-4 hover:border-border-light active:bg-surface-3':
            variant === 'default',
          'bg-surface-4 text-text border border-border-light hover:bg-surface-3 active:bg-surface-4':
            variant === 'secondary',
          'text-text-secondary hover:text-text hover:bg-surface-3 active:bg-surface-4':
            variant === 'ghost',
          'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 active:bg-danger/30':
            variant === 'danger',
          'px-2.5 py-1 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-2.5 text-base': size === 'lg',
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}