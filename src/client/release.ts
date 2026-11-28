import bundledClient from '../../vendor/yapmod/client.json';

export { bundledClient };
export type ClientRelease = typeof bundledClient;

const latest = 'https://api.github.com/repos/yapmod/client/releases/latest';
const assetName = 'yapmod-client.js';
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const sourceLimit = 8 * 1024 * 1024;

type ReleaseServices = {
  fetch: (url: string, options: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'body'>>;
  sha256: (source: string) => Promise<string>;
  readCache: () => Promise<string | null>;
  writeCache: (release: string) => Promise<void>;
};

function versionParts(tag: unknown) {
  if (typeof tag !== 'string' || !/^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(tag)) return null;
  const parts = tag.slice(1).split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

function olderThan(tag: string, reference: string) {
  const version = versionParts(tag)!;
  const baseline = versionParts(reference)!;
  for (let i = 0; i < version.length; i++) {
    if (version[i] !== baseline[i]) return version[i]! < baseline[i]!;
  }
  return false;
}

async function verified(value: unknown, sha256: ReleaseServices['sha256']): Promise<ClientRelease | null> {
  if (!value || typeof value !== 'object') return null;
  const { tag, digest, source } = value as Partial<ClientRelease>;
  if (typeof tag !== 'string' || !versionParts(tag) || typeof digest !== 'string' || !digestPattern.test(digest) ||
      typeof source !== 'string' || !source.trim() || source.length > sourceLimit) return null;
  return 'sha256:' + await sha256(source) === digest ? { tag, digest, source } : null;
}

async function download(fetch: ReleaseServices['fetch'], url: string, signal: AbortSignal, limit: number) {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    headers: { Accept: url === latest ? 'application/vnd.github+json' : '*/*', 'User-Agent': 'Yapmod-Mobile' },
  });
  if (!response.ok) throw new Error('GitHub returned HTTP ' + response.status);
  if (!response.body) throw new Error('Missing GitHub response body.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('GitHub response exceeds the size limit.');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function loadClientRelease(services: ReleaseServices, timeoutMs = 6000): Promise<ClientRelease> {
  const request = new AbortController();
  let current = bundledClient;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<ClientRelease>(resolve => {
    timeout = setTimeout(() => {
      request.abort();
      resolve(current);
    }, timeoutMs);
  });

  async function refresh() {
    try {
      const stored = await services.readCache();
      const cached = stored && await verified(JSON.parse(stored), services.sha256);
      if (cached && !olderThan(cached.tag, current.tag)) current = cached;
    } catch (error) {
      console.warn('[Yapmod] Could not read the client cache.', error);
    }
    if (request.signal.aborted) return current;

    try {
      const release = JSON.parse(await download(services.fetch, latest, request.signal, 512 * 1024));
      const tag = release?.tag_name;
      if (release?.draft !== false || release?.prerelease !== false || !versionParts(tag) ||
          !Array.isArray(release.assets)) throw new Error('Invalid stable release metadata.');
      if (olderThan(tag, current.tag)) return current;
      const asset = release.assets.find((item: { name?: string } | null) => item?.name === assetName);
      const digest = asset?.digest;
      if (typeof digest !== 'string' || !digestPattern.test(digest)) throw new Error('Missing client SHA-256 digest.');
      if (tag === current.tag && digest === current.digest) return current;

      const url = 'https://github.com/yapmod/client/releases/download/' + tag + '/' + assetName;
      const source = await download(services.fetch, url, request.signal, sourceLimit);
      const next = await verified({ tag, digest, source }, services.sha256);
      if (!next) throw new Error('Client release failed SHA-256 verification.');
      if (request.signal.aborted) return current;
      current = next;
      console.info('[Yapmod] Downloaded verified client ' + next.tag + '.');
      await services.writeCache(JSON.stringify(next));
    } catch (error) {
      if (!request.signal.aborted) console.warn('[Yapmod] Using verified client ' + current.tag + '.', error);
    }
    return current;
  }

  try {
    return await Promise.race([refresh(), deadline]);
  } finally {
    clearTimeout(timeout);
    request.abort();
  }
}
