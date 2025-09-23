interface SynauraSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SynauraSpinner({ label, size = 'md' }: SynauraSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10'
  };

  return (
    <div className="flex items-center gap-2 text-white" aria-live="polite" aria-busy="true">
      <span className={`relative inline-flex ${sizeClasses[size]}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-full w-full bg-gradient-to-r from-purple-500 to-pink-500"></span>
      </span>
      {label && <span className="text-sm text-white/70">{label}</span>}
    </div>
  );
}
