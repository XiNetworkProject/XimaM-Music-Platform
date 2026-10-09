'use client';
import { useEffect, useRef, useState } from 'react';
export function useStudioPanels(owner = '') {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [sizes, setSizes] = useState({ left: 350, right: 292 });
  const [loaded, setLoaded] = useState(false);
  const [docked, setDocked] = useState(false);
  useEffect(() => { const media = matchMedia('(min-width:1200px)'); const update = () => setDocked(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(`studio-panels:${owner}`) || '{}'); setSizes({ left: Number.isFinite(saved.left) ? Math.max(280, Math.min(560, saved.left)) : 350, right: Number.isFinite(saved.right) ? Math.max(260, Math.min(480, saved.right)) : 292 }); } catch {}
    setLoaded(true);
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [owner]);
  useEffect(() => { if (!loaded) return; const timer = setTimeout(() => { try { localStorage.setItem(`studio-panels:${owner}`, JSON.stringify(sizes)); } catch {} }, 250); return () => clearTimeout(timer); }, [sizes, loaded, owner]);
  const rightMax = Math.max(260, Math.min(480, width - 280 - 400 - 24));
  const right = Math.min(sizes.right, rightMax);
  return { root, sizes, width, right, rightMax, docked, set: (side: 'left' | 'right', value: number) => setSizes(old => ({ ...old, [side]: value })) };
}
