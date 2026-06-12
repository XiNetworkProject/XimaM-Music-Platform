export default function SynauraPulseBar({ value, className = '' }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-black/[0.07] ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#00c2cb] via-[#7c5cff] to-[#ff4b7a] transition-[width] duration-700"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
