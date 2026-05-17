import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-lg border bg-surface-3 px-3 py-2 text-sm text-text placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-lumina-500 focus:border-transparent',
          'transition-all duration-150',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export function Select({ className, label, error, options, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full rounded-lg border bg-surface-3 px-3 py-2 text-sm text-text',
          'focus:outline-none focus:ring-2 focus:ring-lumina-500 focus:border-transparent',
          'transition-all duration-150',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      >
        {options?.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}