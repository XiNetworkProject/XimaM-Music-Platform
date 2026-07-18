export default function StudioBackground({ variant = 'studio' }: { variant?: 'studio' | 'synaura' }) {
  if (variant === 'synaura') {
    return <div className="synaura-global-background pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden />;
  }

  return <div className="synaura-studio-background pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden />;
}
