export default function StudioBackground({ variant = 'studio' }: { variant?: 'studio' | 'synaura' }) {
  if (variant === 'synaura') {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#F4EFE6]" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,111,97,0.20),transparent_28%),radial-gradient(circle_at_94%_4%,rgba(124,92,255,0.12),transparent_30%),radial-gradient(circle_at_60%_100%,rgba(0,194,203,0.10),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(#ded4c7_1px,transparent_1px),linear-gradient(90deg,#ded4c7_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {/* Gradient global */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#05010b] via-[#050214] to-[#020010]" />
      {/* Grille subtile */}
      <div
        className="absolute inset-[-1px] opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Halos néon */}
      <div
        className="absolute w-[420px] h-[420px] -top-[160px] -left-[120px] rounded-full blur-[100px] opacity-[0.7]"
        style={{
          background:
            'radial-gradient(circle, rgba(111,76,255,0.9) 0%, rgba(111,76,255,0.25) 35%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[380px] h-[380px] -bottom-[180px] -right-[60px] rounded-full blur-[90px] opacity-[0.6]"
        style={{
          background:
            'radial-gradient(circle, rgba(0,208,187,0.85) 0%, rgba(0,208,187,0.3) 40%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[520px] h-[520px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] rounded-full blur-[120px] opacity-[0.45] transform-gpu will-change-transform bg-no-repeat pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(235,102,255,0.95) 0%, rgba(235,102,255,0.35) 38%, transparent 72%)',
        }}
      />
    </div>
  );
}

