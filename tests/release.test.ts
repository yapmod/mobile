import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

test('release refresh verifies new bytes and preserves the last verified client on failure', async t => {
  const { syncClient } = await import('../scripts/sync-client.mjs');
  const directory = await mkdtemp(join(tmpdir(), 'yapmod-client-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const clientFile = pathToFileURL(join(directory, 'client.json'));
  const source = '/* test client */';
  const digest = 'sha256:' + createHash('sha256').update(source).digest('hex');
  let assetBody = source;
  let publishedDigest = digest;
  const release = t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url === 'https://api.github.com/repos/yapmod/client/releases/latest') {
      return Response.json({ tag_name: 'v1', assets: [{ name: 'yapmod-client.js', digest: publishedDigest }] });
    }
    assert.equal(url, 'https://github.com/yapmod/client/releases/download/v1/yapmod-client.js');
    return new Response(assetBody);
  });
  assert.equal(await syncClient({ clientFile }), 'v1');
  const saved = await readFile(clientFile, 'utf8');
  assert.deepEqual(JSON.parse(saved), { tag: 'v1', digest, source });
  await syncClient({ clientFile });
  assert.equal(release.mock.callCount(), 3); // Second check only fetched release metadata.

  assert.equal(await syncClient({ clientFile, bundledOnly: true }), 'v1');
  assert.equal(release.mock.callCount(), 3); // Tagged builds never consult the latest release.

  publishedDigest = 'sha256:' + '0'.repeat(64);
  assetBody = 'unexpected response';
  await assert.rejects(syncClient({ clientFile }), /SHA-256/);
  assert.equal(await readFile(clientFile, 'utf8'), saved);

  release.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  assert.equal(await syncClient({ clientFile, allowCached: true }), 'v1');
  await writeFile(clientFile, JSON.stringify({ tag: 'v1', digest, source: 'damaged' }));
  await assert.rejects(syncClient({ clientFile, bundledOnly: true }), /SHA-256/);
  await assert.rejects(syncClient({ clientFile, allowCached: true }), /HTTP 503/);
});
