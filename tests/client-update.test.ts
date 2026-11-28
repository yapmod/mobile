import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { bundledClient, loadClientRelease } from '../src/client/release';
import { bootstrapScript } from '../src/injection/bootstrap';

const latestUrl = 'https://api.github.com/repos/yapmod/client/releases/latest';
const sha256 = async (source: string) => createHash('sha256').update(source).digest('hex');
const source = bundledClient.source + '\nwindow.downloadedClientRan = true;';

async function fixture() {
  const next = { tag: 'v100.0.0', digest: 'sha256:' + await sha256(source), source };
  let cached: string | null = null;
  const metadata = {
    tag_name: next.tag, draft: false, prerelease: false,
    assets: [{ name: 'yapmod-client.js', digest: next.digest }],
  };
  const assetUrl = 'https://github.com/yapmod/client/releases/download/' + next.tag + '/yapmod-client.js';
  const services = {
    sha256,
    readCache: async () => cached,
    writeCache: async (value: string) => { cached = value; },
    fetch: async (url: string, _options: RequestInit) => {
      if (url === latestUrl) return Response.json(metadata);
      assert.equal(url, assetUrl);
      return new Response(next.source);
    },
  };
  return { next, services, metadata };
}

test('the mobile runtime downloads, caches and injects a verified client', async t => {
  const { next, services } = await fixture();
  const fetch = t.mock.method(services, 'fetch');
  const selected = await loadClientRelease(services);
  assert.deepEqual(selected, next);
  assert.deepEqual(JSON.parse((await services.readCache())!), next);
  assert.deepEqual(await loadClientRelease(services), next);
  assert.equal(fetch.mock.callCount(), 3); // The second launch only requests metadata.

  const origin = 'https://www.yapin.gg';
  const dom = new JSDOM('', { url: origin, runScripts: 'outside-only' });
  try {
    const messages: string[] = [];
    dom.window.matchMedia = (media: string) => Object.assign(new dom.window.EventTarget(), {
      media, matches: false, onchange: null, addListener() {}, removeListener() {},
    });
    dom.window.ReactNativeWebView = { postMessage: (raw: string) => messages.push(JSON.parse(raw).type) };
    dom.window.eval(bootstrapScript(origin, true, 'update-test-channel', selected));
    assert.equal(dom.window.downloadedClientRan, true);
    assert.deepEqual(messages.slice(0, 2), ['ready', 'active']);
    dom.window.eval(bootstrapScript(origin, false, 'update-test-channel', selected));
  } finally {
    dom.window.close();
  }
});

test('a damaged download or cache falls back to a verified release', async t => {
  const { next, services } = await fixture();
  const write = t.mock.method(services, 'writeCache');
  const originalFetch = services.fetch;
  const fetch = t.mock.method(services, 'fetch', async (url: string, options: RequestInit) => {
    if (url === latestUrl) return originalFetch(url, options);
    return new Response('unexpected bytes');
  });
  assert.deepEqual(await loadClientRelease(services), bundledClient);
  assert.equal(write.mock.callCount(), 0);

  fetch.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  await services.writeCache(JSON.stringify(next));
  assert.deepEqual(await loadClientRelease(services), next);
  await services.writeCache(JSON.stringify({ ...next, source: 'damaged cache' }));
  assert.deepEqual(await loadClientRelease(services), bundledClient);
});

test('a stable release check never downgrades a newer cached client', async t => {
  const { next, services, metadata } = await fixture();
  await services.writeCache(JSON.stringify(next));
  metadata.tag_name = bundledClient.tag;
  const fetch = t.mock.method(services, 'fetch');
  assert.deepEqual(await loadClientRelease(services), next);
  assert.equal(fetch.mock.callCount(), 1);
});

test('startup uses the verified cache when the GitHub deadline expires', async t => {
  const { next, services } = await fixture();
  await services.writeCache(JSON.stringify(next));
  let signal: AbortSignal | null | undefined;
  const fetch = t.mock.method(services, 'fetch', async (_url: string, options: RequestInit): Promise<Response> => {
    signal = options.signal;
    return new Promise(() => {});
  });
  assert.deepEqual(await loadClientRelease(services, 25), next);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(signal?.aborted, true);
});
