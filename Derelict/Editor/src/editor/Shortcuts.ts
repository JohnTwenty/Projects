export interface ShortcutHandlers {
  rotate?: (dir: 1 | -1) => void;
  unselect?: () => void;
  save?: () => void;
  delete?: () => void;
}

export function registerShortcuts(target: HTMLElement | Document, h: ShortcutHandlers) {
  (target as any).addEventListener('keydown', (ev: KeyboardEvent) => {
    const targetEl = ev.target as HTMLElement | null;
    const tag = targetEl?.tagName;
    const modalOpen = document.querySelector('.modal-overlay');
    const editable =
      targetEl?.isContentEditable ||
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT';
    if (modalOpen || editable) return;

    if (ev.key === 'r' || ev.key === 'R') {
      h.rotate?.(ev.shiftKey ? -1 : 1);
      ev.preventDefault();
    } else if (ev.key === 'Escape') {
      h.unselect?.();
    } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
      h.delete?.();
      ev.preventDefault();
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') {
      h.save?.();
      ev.preventDefault();
    }
  });
}
