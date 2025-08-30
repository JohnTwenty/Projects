export function loadSpriteManifestFromText(text) {
    const lines = text.split(/\r?\n/);
    const map = new Map();
    lines.forEach((raw, idx) => {
        const line = raw.trim();
        if (!line || line.startsWith('#'))
            return;
        const parts = line.split(/\s+/);
        if (parts.length !== 9) {
            throw new Error(`Invalid field count on line ${idx + 1}`);
        }
        const [key, file, x, y, w, h, layer, xoff, yoff] = parts;
        const nums = [x, y, w, h, layer, xoff, yoff].map((n) => {
            const val = parseInt(n, 10);
            if (Number.isNaN(val)) {
                throw new Error(`Invalid integer on line ${idx + 1}`);
            }
            return val;
        });
        const entry = {
            key,
            file,
            x: nums[0],
            y: nums[1],
            w: nums[2],
            h: nums[3],
            layer: nums[4],
            xoff: nums[5],
            yoff: nums[6],
        };
        map.set(key, entry);
    });
    return { entries: [...map.values()] };
}
