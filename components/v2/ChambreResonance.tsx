/** Decorative only. Deterministic geometry, no audio, timers, pointer tracking or data. */
export default function ChambreResonance({ className = '' }: { className?: string }) {
  return <div className={`chambre-resonance ${className}`} aria-hidden="true">
    <svg viewBox="0 0 800 600" fill="none" focusable="false">
      <g className="chambre-resonance-body">
        {Array.from({ length: 28 }, (_, index) => {
          const phase = index / 27;
          const points = Array.from({ length: 97 }, (_, point) => {
            const angle = point / 96 * Math.PI * 2;
            const radius = 185 + 34 * Math.sin(angle * 3 + phase * 2.4);
            const x = 400 + Math.cos(angle) * radius * (1 + phase * .42);
            const y = 300 + Math.sin(angle) * radius * .73 + Math.cos(angle * 2 + phase * 2.8) * 62 + (phase - .5) * 106;
            return `${point ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
          }).join(' ');
          return <path key={index} d={`${points} Z`} className={index % 7 === 0 ? 'chambre-resonance-ridge' : undefined} />;
        })}
      </g>
      <g className="chambre-resonance-reference">
        <path d="M92 302H124 M108 286V318 M676 302H708 M692 286V318" />
        <path d="M400 64V86 M400 514V536" />
        <circle cx="400" cy="300" r="4" />
      </g>
    </svg>
  </div>;
}
