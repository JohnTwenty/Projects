export function qs<T extends Element>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel) as T | null;
  if (!el) throw new Error(`Missing element ${sel}`);
  return el;
}

export function createEl<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}
