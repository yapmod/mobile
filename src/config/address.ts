export function webAddress(input: unknown): URL | null {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function isInternal(input: unknown, origin: string): boolean {
  return webAddress(input)?.origin === origin;
}
