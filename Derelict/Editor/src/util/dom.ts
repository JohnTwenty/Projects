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

export function showModal(
  title: string,
  body: HTMLElement,
  actions: { label: string; onClick: () => void }[],
) {
  const overlay = createEl('div', 'modal-overlay');
  const dlg = createEl('div', 'modal');
  const heading = createEl('h2');
  heading.textContent = title;
  dlg.appendChild(heading);
  dlg.appendChild(body);
  const btnRow = createEl('div', 'actions');
  for (const act of actions) {
    const btn = createEl('button');
    btn.textContent = act.label;
    btn.addEventListener('click', () => {
      act.onClick();
    });
    btnRow.appendChild(btn);
  }
  dlg.appendChild(btnRow);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);
  return {
    close() {
      document.body.removeChild(overlay);
    },
  };
}
