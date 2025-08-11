# Derelict Renderer

A minimal Canvas2D renderer for Derelict board states. The renderer takes a
`BoardState`, a sprite manifest and viewport information and draws everything
onto a `CanvasRenderingContext2D` or `OffscreenCanvasRenderingContext2D`.

## Usage

```ts
import { createRenderer } from './renderer';
import { loadSpriteManifestFromText } from './manifest';

const renderer = createRenderer();
renderer.setSpriteManifest(loadSpriteManifestFromText(manifestText));
renderer.setAssetResolver((key) => myImageCache[key]);
renderer.resize(canvas.width, canvas.height);
renderer.render(ctx, boardState, viewport);
```

## Manifest format

Sprite manifests are provided as plain text, one entry per line:

```
string_id file_name x y width height layer xoff yoff
```

* Lines starting with `#` and blank lines are ignored.
* `string_id` is used as the sprite key. Integer-like values represent cell
  types; other strings represent token types.
* `x=y=w=h=0` means the whole image is used.
* All numeric fields must be integers. Negative offsets are allowed.
* Duplicate keys are allowed; the last entry wins.
```
