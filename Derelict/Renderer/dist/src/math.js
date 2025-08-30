export function boardToScreen(cell, vp) {
    const sizePx = vp.cellSize * (vp.scale || 1);
    return {
        x: (cell.x - vp.origin.x) * sizePx,
        y: (cell.y - vp.origin.y) * sizePx,
        width: sizePx,
        height: sizePx,
    };
}
export function isCellVisible(cell, vp, canvasPx) {
    const rect = boardToScreen(cell, vp);
    return (rect.x + rect.width > 0 &&
        rect.y + rect.height > 0 &&
        rect.x < canvasPx.w &&
        rect.y < canvasPx.h);
}
