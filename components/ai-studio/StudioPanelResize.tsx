'use client';
import { useRef, type PointerEvent } from 'react';
export default function StudioPanelResize({ side, value, min, max, change, reset }: { side: 'left' | 'right'; value: number; min: number; max: number; change: (width: number) => void; reset: () => void }) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    change(Math.max(min, Math.min(max, drag.current.width + (event.clientX - drag.current.x) * (side === 'left' ? 1 : -1))));
  };
  return <div className={`sw-resize sw-resize-${side}`} title="Glisser pour ajuster · double-clic pour réinitialiser · flèches au clavier" role="separator" aria-orientation="vertical" aria-label={`Largeur du panneau ${side === 'left' ? 'de création' : 'des détails'}`} aria-valuenow={Math.round(value)} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
    onDoubleClick={reset} onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { x: event.clientX, width: value }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={event => { move(event); drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={event => { const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0; if (direction) { event.preventDefault(); change(Math.max(min, Math.min(max, value + direction * (side === 'left' ? 1 : -1) * (event.shiftKey ? 40 : 10)))); } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); change(event.key === 'Home' ? min : max); } }}><span/></div>;
}
