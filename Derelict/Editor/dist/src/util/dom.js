export function qs(root, sel) {
    const el = root.querySelector(sel);
    if (!el)
        throw new Error(`Missing element ${sel}`);
    return el;
}
export function createEl(tag, className) {
    const el = document.createElement(tag);
    if (className)
        el.className = className;
    return el;
}
export function showModal(title, body, actions) {
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
