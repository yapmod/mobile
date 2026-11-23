import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const latest = 'https://api.github.com/repos/yapmod/client/releases/latest';
const assetName = 'yapmod-client.js';
const defaultClientFile = new URL('../vendor/yapmod/client.json', import.meta.url);
const limit = 8 * 1024 * 1024;

function verifiedClient(value) {
  if (!value || typeof value.tag !== 'string' || typeof value.source !== 'string' ||
      !value.source.trim() || Buffer.byteLength(value.source) > limit) return false;
  return value.digest === 'sha256:' + createHash('sha256').update(value.source).digest('hex');
}

async function download(url, maxBytes) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Yapmod-Mobile', Accept: url === latest ? 'application/vnd.github+json' : '*/*' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('GitHub returned HTTP ' + response.status);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Release response exceeds the size limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function syncClient({ allowCached = false, bundledOnly = false, clientFile = defaultClientFile } = {}) {
  let cached;
  try {
    const saved = JSON.parse(await readFile(clientFile, 'utf8'));
    if (verifiedClient(saved)) cached = saved;
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }

  if (bundledOnly) {
    if (!cached) throw new Error('The tagged Yapmod client failed SHA-256 verification.');
    return cached.tag;
  }

  let next;
  try {
    const release = JSON.parse(await download(latest, 512 * 1024));
    const tag = release.tag_name;
    const asset = release.assets.find(item => item.name === assetName);
    if (release.draft || release.prerelease || typeof tag !== 'string' || !tag ||
        !/^sha256:[0-9a-f]{64}$/.test(asset?.digest ?? '')) {
      throw new Error('Stable release is missing the client asset or its SHA-256 digest.');
    }
    if (cached?.digest === asset.digest && cached.tag === tag) return cached.tag;
    const url = 'https://github.com/yapmod/client/releases/download/' + encodeURIComponent(tag) + '/' + assetName;
    next = { tag, digest: asset.digest, source: await download(url, limit) };
    if (!verifiedClient(next)) throw new Error('Client release failed SHA-256 verification.');
  } catch (error) {
    if (!allowCached || !cached) throw error;
    console.warn('[Yapmod] Using verified client ' + cached.tag + '. ' + error.message);
    return cached.tag;
  }

  const temporary = new URL(clientFile.href + '.' + randomUUID() + '.tmp');
  try {
    await writeFile(temporary, JSON.stringify(next) + '\n');
    await rename(temporary, clientFile);
  } finally {
    await rm(temporary, { force: true });
  }
  return next.tag;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  console.log('Verified Yapmod client', await syncClient());
}
