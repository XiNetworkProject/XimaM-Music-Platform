export type StudioHotkeyHandlers = {
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onFocusSearch?: () => void;
  onClose?: () => void;
  onSelectUp?: () => void;
  onSelectDown?: () => void;
  onOpenInspector?: () => void;
};

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return node.isContentEditable;
}

export function handleStudioHotkeys(e: KeyboardEvent, h: StudioHotkeyHandlers) {
  // Don't steal keystrokes from inputs/textareas
  if (isTypingTarget(e.target)) return;

  const key = e.key;
  const meta = e.metaKey || e.ctrlKey;

  if (meta && (key === 'f' || key === 'F')) {
    e.preventDefault();
    h.onFocusSearch?.();
    return;
  }

  if (key === ' ') {
    e.preventDefault();
    h.onPlayPause?.();
    return;
  }

  if (key === 'Escape') {
    h.onClose?.();
    return;
  }

  if (key === 'ArrowUp') {
    e.preventDefault();
    h.onSelectUp?.();
    return;
  }

  if (key === 'ArrowDown') {
    e.preventDefault();
    h.onSelectDown?.();
    return;
  }

  if (key === 'Enter') {
    h.onOpenInspector?.();
    return;
  }

  if (key === 'j' || key === 'J') {
    h.onPrev?.();
    return;
  }
  if (key === 'k' || key === 'K') {
    h.onPlayPause?.();
    return;
  }
  if (key === 'l' || key === 'L') {
    h.onNext?.();
    return;
  }
}

