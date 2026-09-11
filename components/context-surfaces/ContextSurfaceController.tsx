'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  closeTopContextSurface,
  createContextSurfaceEntry,
  pushContextSurface,
  readContextSurfaceHistory,
  reconcileContextSurfaceHistory,
  replaceContextSurface,
  withContextSurfaceHistory,
  type ContextSurfaceEntry,
  type ContextSurfaceInput,
} from '@/lib/contextSurfaces';
import {
  SynauraOverlay,
  SynauraOverlayDescription,
  SynauraOverlayTitle,
} from '@/components/ui/SynauraOverlay';

export type ContextSurfaceRendererProps = {
  entry: ContextSurfaceEntry;
  closeSurface: () => void;
  openSurface: ContextSurfaceControllerValue['openSurface'];
  replaceSurface: ContextSurfaceControllerValue['replaceSurface'];
};

export type ContextSurfaceRenderer = ComponentType<ContextSurfaceRendererProps>;

type OpenOptions = {
  trigger?: HTMLElement | null;
  replace?: boolean;
};

type TriggerTarget = {
  element: HTMLElement | null;
  logicalKey: string | null;
};

type ContextSurfaceControllerValue = {
  current: ContextSurfaceEntry | null;
  depth: number;
  openSurface: (input: ContextSurfaceInput, options?: OpenOptions) => ContextSurfaceEntry;
  replaceSurface: (input: ContextSurfaceInput, options?: Omit<OpenOptions, 'replace'>) => ContextSurfaceEntry;
  closeSurface: () => void;
  registerRenderer: (surface: string, renderer: ContextSurfaceRenderer) => () => void;
};

const ContextSurfaceControllerContext = createContext<ContextSurfaceControllerValue | null>(null);

function logicalTriggerKey(element: HTMLElement | null): string | null {
  return element?.closest<HTMLElement>('[data-context-surface-trigger-key]')?.dataset.contextSurfaceTriggerKey || null;
}

function restoreFocus(target: TriggerTarget | undefined, origin: ContextSurfaceEntry['origin']) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (target?.element?.isConnected) {
        target.element.focus();
        return;
      }
      if (target?.logicalKey) {
        const logical = document.querySelector<HTMLElement>(
          `[data-context-surface-trigger-key="${CSS.escape(target.logicalKey)}"]`,
        );
        if (logical) {
          logical.focus();
          return;
        }
      }
      const fallback = origin === 'live'
        ? document.querySelector<HTMLElement>('[data-testid="synaura-scroll-feed"]')
        : document.querySelector<HTMLElement>(`[data-context-surface-origin="${origin}"]`);
      fallback?.focus();
    });
  });
}

function MissingSurface({ closeSurface }: Pick<ContextSurfaceRendererProps, 'closeSurface'>) {
  return (
    <div className="p-6 sm:p-7">
      <SynauraOverlayTitle>Surface indisponible</SynauraOverlayTitle>
      <SynauraOverlayDescription className="mt-2">
        Cette vue courte n’est plus disponible. La page d’origine est restée intacte.
      </SynauraOverlayDescription>
      <button
        type="button"
        onClick={closeSurface}
        className="syn-interactive syn-touch-target mt-6 rounded-full bg-[var(--syn-accent)] px-5 text-sm font-black text-white"
      >
        Revenir
      </button>
    </div>
  );
}

function ContextSurfaceHost({
  current,
  renderer,
  controller,
}: {
  current: ContextSurfaceEntry | null;
  renderer: ContextSurfaceRenderer | null;
  controller: ContextSurfaceControllerValue;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    const frame = window.requestAnimationFrame(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(
        '[autofocus], button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (focusable || contentRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [current?.historyKey]);

  const Renderer = renderer;
  const presentation = current?.presentation === 'auto' ? 'context-responsive' : current?.presentation;

  return (
    <SynauraOverlay
      open={Boolean(current)}
      onClose={controller.closeSurface}
      presentation={presentation || 'context-responsive'}
      history={false}
      className="context-surface-panel overscroll-contain"
    >
      {current ? (
        <div
          key={current.historyKey}
          ref={contentRef}
          tabIndex={-1}
          data-context-surface={current.surface}
          data-context-surface-history-key={current.historyKey}
          className="min-h-full outline-none"
        >
          {Renderer ? (
            <Renderer
              entry={current}
              closeSurface={controller.closeSurface}
              openSurface={controller.openSurface}
              replaceSurface={controller.replaceSurface}
            />
          ) : <MissingSurface closeSurface={controller.closeSurface} />}
        </div>
      ) : null}
    </SynauraOverlay>
  );
}

export function ContextSurfaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [stack, setStack] = useState<ContextSurfaceEntry[]>([]);
  const [registryRevision, setRegistryRevision] = useState(0);
  const stackRef = useRef(stack);
  const pathnameRef = useRef(pathname);
  const closingRef = useRef(false);
  const renderersRef = useRef(new Map<string, ContextSurfaceRenderer>());
  const triggersRef = useRef(new Map<string, TriggerTarget>());

  useEffect(() => { stackRef.current = stack; }, [stack]);

  const registerRenderer = useCallback((surface: string, renderer: ContextSurfaceRenderer) => {
    renderersRef.current.set(surface, renderer);
    setRegistryRevision((value) => value + 1);
    return () => {
      if (renderersRef.current.get(surface) === renderer) {
        renderersRef.current.delete(surface);
        setRegistryRevision((value) => value + 1);
      }
    };
  }, []);

  const openSurface = useCallback((input: ContextSurfaceInput, options: OpenOptions = {}) => {
    let entry = createContextSurfaceEntry(input);
    const trigger = options.trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const currentStack = stackRef.current;
    let nextStack: ContextSurfaceEntry[];
    let historyMode: 'push' | 'replace';
    if (options.replace) {
      nextStack = replaceContextSurface(currentStack, entry);
      historyMode = currentStack.length ? 'replace' : 'push';
    } else {
      const result = pushContextSurface(currentStack, entry);
      nextStack = result.stack;
      historyMode = result.mode;
    }

    const current = currentStack.at(-1);
    if (historyMode === 'replace' && current) {
      entry = { ...entry, historyKey: current.historyKey };
      nextStack = replaceContextSurface(currentStack, entry);
    } else {
      triggersRef.current.set(entry.historyKey, { element: trigger, logicalKey: logicalTriggerKey(trigger) });
    }

    const nextState = withContextSurfaceHistory(window.history.state, nextStack, window.location.pathname);
    if (historyMode === 'replace') window.history.replaceState(nextState, '', window.location.href);
    else window.history.pushState(nextState, '', window.location.href);
    stackRef.current = nextStack;
    setStack(nextStack);
    return entry;
  }, []);

  const replaceSurface = useCallback((input: ContextSurfaceInput, options: Omit<OpenOptions, 'replace'> = {}) => (
    openSurface(input, { ...options, replace: true })
  ), [openSurface]);

  const closeSurface = useCallback(() => {
    if (closingRef.current) return;
    const currentStack = stackRef.current;
    const current = currentStack.at(-1);
    if (!current) return;
    const marker = readContextSurfaceHistory(window.history.state);
    if (marker?.stack.at(-1)?.historyKey === current.historyKey) {
      closingRef.current = true;
      window.history.back();
      window.setTimeout(() => { closingRef.current = false; }, 250);
      return;
    }
    const next = closeTopContextSurface(currentStack);
    window.history.replaceState(
      withContextSurfaceHistory(window.history.state, next, window.location.pathname),
      '',
      window.location.href,
    );
    stackRef.current = next;
    setStack(next);
    restoreFocus(triggersRef.current.get(current.historyKey), current.origin);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const result = reconcileContextSurfaceHistory(stackRef.current, event.state, window.location.pathname);
      stackRef.current = result.stack;
      setStack(result.stack);
      const closed = result.closed[0];
      if (closed) restoreFocus(triggersRef.current.get(closed.historyKey), closed.origin);
      closingRef.current = false;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    const closed = [...stackRef.current].reverse();
    stackRef.current = [];
    setStack([]);
    if (closed[0]) restoreFocus(triggersRef.current.get(closed[0].historyKey), closed[0].origin);
  }, [pathname]);

  const current = stack.at(-1) || null;
  const controller = useMemo<ContextSurfaceControllerValue>(() => ({
    current,
    depth: stack.length,
    openSurface,
    replaceSurface,
    closeSurface,
    registerRenderer,
  }), [closeSurface, current, openSurface, registerRenderer, replaceSurface, stack.length]);
  const renderer = current ? renderersRef.current.get(current.surface) || null : null;
  void registryRevision;

  return (
    <ContextSurfaceControllerContext.Provider value={controller}>
      {children}
      <ContextSurfaceHost current={current} renderer={renderer} controller={controller} />
    </ContextSurfaceControllerContext.Provider>
  );
}

export function useContextSurfaceController() {
  const context = useContext(ContextSurfaceControllerContext);
  if (!context) throw new Error('useContextSurfaceController must be used within ContextSurfaceProvider');
  return context;
}

export function useContextSurfaceRenderer(surface: string, renderer: ContextSurfaceRenderer) {
  const { registerRenderer } = useContextSurfaceController();
  useEffect(() => registerRenderer(surface, renderer), [registerRenderer, renderer, surface]);
}
