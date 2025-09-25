export function parseMissionListing(text: string): string[] {
  const names = new Set<string>();
  const regex = /href\s*=\s*["']([^"'\/]+\.txt)["']/gi;
  for (const match of text.matchAll(regex)) {
    names.add(match[1]);
  }
  return [...names];
}
