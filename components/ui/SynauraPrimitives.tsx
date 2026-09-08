'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { twMerge } from 'tailwind-merge';

const buttonStyles = cva(
  'syn-interactive inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-full font-black outline-none disabled:pointer-events-none disabled:opacity-45 aria-[busy=true]:cursor-wait',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)] shadow-[var(--syn-shadow-low)] hover:-translate-y-0.5 hover:shadow-[var(--syn-shadow-medium)] active:translate-y-0',
        accent: 'bg-[var(--syn-accent)] text-white shadow-[var(--syn-glow-accent)] hover:brightness-110',
        secondary: 'border border-[var(--syn-border)] bg-[var(--syn-surface)] text-[var(--syn-text-primary)] hover:bg-[var(--syn-soft)]',
        ghost: 'bg-transparent text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)]',
        danger: 'bg-[var(--syn-destructive)] text-white hover:brightness-110',
      },
      size: {
        sm: 'min-h-9 px-3 text-xs',
        md: 'px-4 text-sm',
        lg: 'min-h-12 px-6 text-base',
        icon: 'h-11 w-11 min-w-11 p-0',
      },
      fullWidth: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface SynauraButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  loading?: boolean;
}

export const SynauraButton = forwardRef<HTMLButtonElement, SynauraButtonProps>(function SynauraButton(
  { className, children, loading = false, disabled, variant, size, fullWidth, ...props },
  ref,
) {
  return (
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} className={twMerge(buttonStyles({ variant, size, fullWidth }), className)} {...props}>
      {loading ? <Loader2 data-motion-essential="true" className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export function SynauraIconButton({ label, children, ...props }: Omit<SynauraButtonProps, 'aria-label' | 'size'> & { label: string; children: ReactNode }) {
  return <SynauraButton size="icon" aria-label={label} title={label} {...props}>{children}</SynauraButton>;
}

type FieldShellProps = { label?: string; hint?: string; error?: string; required?: boolean; inputId: string; children: ReactNode };

function FieldShell({ label, hint, error, required, inputId, children }: FieldShellProps) {
  const supportId = `${inputId}-support`;
  return (
    <div className="grid gap-1.5">
      {label ? <label htmlFor={inputId} className="text-xs font-black text-[var(--syn-text-primary)]">{label}{required ? <span className="text-[var(--syn-destructive)]"> *</span> : null}</label> : null}
      {children}
      {error || hint ? <p id={supportId} className={`text-xs ${error ? 'text-[var(--syn-destructive)]' : 'text-[var(--syn-text-secondary)]'}`}>{error || hint}</p> : null}
    </div>
  );
}

const fieldClass = 'syn-interactive min-h-11 w-full rounded-[var(--syn-radius-md)] border border-[var(--syn-border)] bg-[var(--syn-surface)] px-3.5 text-sm text-[var(--syn-text-primary)] placeholder:text-[var(--syn-text-secondary)] hover:border-[var(--syn-accent)]/60 disabled:cursor-not-allowed disabled:opacity-50';

export interface SynauraInputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string }
export const SynauraInput = forwardRef<HTMLInputElement, SynauraInputProps>(function SynauraInput({ id, label, hint, error, required, className, ...props }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <FieldShell label={label} hint={hint} error={error} required={required} inputId={inputId}><input ref={ref} id={inputId} required={required} aria-invalid={Boolean(error) || undefined} aria-describedby={error || hint ? `${inputId}-support` : undefined} className={twMerge(fieldClass, className)} {...props} /></FieldShell>;
});

export interface SynauraTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; hint?: string; error?: string }
export const SynauraTextarea = forwardRef<HTMLTextAreaElement, SynauraTextareaProps>(function SynauraTextarea({ id, label, hint, error, required, className, rows = 4, ...props }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <FieldShell label={label} hint={hint} error={error} required={required} inputId={inputId}><textarea ref={ref} id={inputId} required={required} rows={rows} aria-invalid={Boolean(error) || undefined} aria-describedby={error || hint ? `${inputId}-support` : undefined} className={twMerge(fieldClass, 'resize-y py-3', className)} {...props} /></FieldShell>;
});

export interface SynauraSelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; hint?: string; error?: string }
export const SynauraSelect = forwardRef<HTMLSelectElement, SynauraSelectProps>(function SynauraSelect({ id, label, hint, error, required, className, children, ...props }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <FieldShell label={label} hint={hint} error={error} required={required} inputId={inputId}><select ref={ref} id={inputId} required={required} aria-invalid={Boolean(error) || undefined} aria-describedby={error || hint ? `${inputId}-support` : undefined} className={twMerge(fieldClass, className)} {...props}>{children}</select></FieldShell>;
});

export function SynauraCheckbox({ label, description, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  const id = props.id || useId();
  return <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--syn-radius-md)] ${className}`}><input {...props} id={id} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--syn-accent)]" /><span><span className="block text-sm font-black">{label}</span>{description ? <span className="mt-0.5 block text-xs text-[var(--syn-text-secondary)]">{description}</span> : null}</span></label>;
}

export function SynauraSwitch({ checked, onCheckedChange, label, disabled = false }: { checked: boolean; onCheckedChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onCheckedChange(!checked)} className={`syn-interactive relative h-7 w-12 rounded-full disabled:opacity-50 ${checked ? 'bg-[var(--syn-accent)]' : 'bg-[var(--syn-soft-strong)]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} /></button>;
}

export function SynauraSlider({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = props.id || useId();
  return <label htmlFor={id} className="grid gap-2 text-xs font-black"><span>{label}</span><input {...props} id={id} type="range" className="h-11 w-full accent-[var(--syn-accent)]" /></label>;
}

export function SynauraTabs<T extends string>({ items, value, onChange, label = 'Onglets' }: { items: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (value: T) => void; label?: string }) {
  return <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-[var(--syn-radius-md)] bg-[var(--syn-soft)] p-1">{items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} onClick={() => onChange(item.value)} className={`syn-interactive min-h-10 shrink-0 rounded-[calc(var(--syn-radius-md)-0.2rem)] px-4 text-sm font-black ${value === item.value ? 'bg-[var(--syn-surface)] text-[var(--syn-text-primary)] shadow-[var(--syn-shadow-low)]' : 'text-[var(--syn-text-secondary)]'}`}>{item.label}</button>)}</div>;
}

export function SynauraSegmentedControl<T extends string>(props: Parameters<typeof SynauraTabs<T>>[0]) {
  return <SynauraTabs {...props} />;
}

export function SynauraBadge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; className?: string }) {
  const tones = { neutral: 'bg-[var(--syn-soft)] text-[var(--syn-text-secondary)]', accent: 'bg-[var(--syn-accent)]/12 text-[var(--syn-accent)]', success: 'bg-[var(--syn-success)]/12 text-[var(--syn-success)]', warning: 'bg-[var(--syn-warning)]/12 text-[var(--syn-warning)]', danger: 'bg-[var(--syn-destructive)]/12 text-[var(--syn-destructive)]' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${tones[tone]} ${className}`}>{children}</span>;
}

export function SynauraSurface({ children, elevated = false, className = '' }: { children: ReactNode; elevated?: boolean; className?: string }) {
  return <div className={`rounded-[var(--syn-radius-lg)] border border-[var(--syn-border)] ${elevated ? 'bg-[var(--syn-elevated-surface)] shadow-[var(--syn-shadow-medium)]' : 'bg-[var(--syn-surface)] shadow-[var(--syn-shadow-low)]'} ${className}`}>{children}</div>;
}
