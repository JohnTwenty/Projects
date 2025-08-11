export type AssetResolver = (
  key: string
) => HTMLImageElement | ImageBitmap | undefined;

export const defaultAssetResolver: AssetResolver = () => undefined;
