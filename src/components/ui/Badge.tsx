import { cn } from '../../lib/utils';

interface BadgeProps {
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export function Badge({ className, variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-surface-4 text-text-secondary': variant === 'default',
          'bg-success/15 text-success': variant === 'success',
          'bg-warning/15 text-warning': variant === 'warning',
          'bg-danger/15 text-danger': variant === 'danger',
          'bg-lumina-500/15 text-lumina-300': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  );
}