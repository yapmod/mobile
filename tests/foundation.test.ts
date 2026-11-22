import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { isInternal, webAddress } from '../src/config/address';
import { readMessage } from '../src/bridge/messages';
import { allowChildFrame } from '../src/webview/frameNavigation';
import { bootstrapScript } from '../src/injection/bootstrap';

const origin = 'https://www.yapin.gg';

test('seule l’origine HTTPS configurée est interne', () => {
  assert.ok(isInternal(origin + ':443/chat?q=1', origin));
  for (const url of [origin + '.example', origin + '@example.org', origin + ':8443',
    'https://user@www.yapin.gg', 'http://www.yapin.gg', 'data:text/plain,test', 'about:blank', '']) {
    assert.equal(isInternal(url, origin), false);
  }
  assert.equal(webAddress(undefined), null);
});

const channel = '860b0ce6-970b-4436-907d-209fcea819be';

test('la passerelle valide la provenance native, le canal et la forme exacte', () => {
  for (const type of ['ready', 'active', 'inactive', 'error', 'settings']) {
    const message = { v: 2, type, channel };
    const data = JSON.stringify(message);
    assert.deepEqual(readMessage(origin, data, origin, channel), message);
    assert.equal(readMessage('https://example.org', data, origin, channel), null);
    assert.equal(readMessage(origin, data, origin, 'another-channel'), null);
  }
  for (const value of [null, [], { v: 2, type: 'run', channel }, { v: 1, type: 'ready', channel },
    { v: 2, type: 'ready', channel, origin }, { v: 2, type: 'ready' }]) {
    assert.equal(readMessage(origin, JSON.stringify(value), origin, channel), null);
  }
  assert.equal(readMessage(origin, '{', origin, channel), null);
});

function page(url = origin) {
  const dom = new JSDOM('<body></body>', { url, runScripts: 'outside-only' });
  const messages: string[] = [];
  dom.window.ReactNativeWebView = { postMessage(raw: string) {
    const message = readMessage(url, raw, origin, channel);
    if (message) messages.push(message.type);
  } };
  return { dom, messages, inject(enabled: boolean) {
    dom.window.eval(bootstrapScript(origin, enabled, channel));
  } };
}

test('le plugin local monte une section, ouvre les paramètres et nettoie son intégration', async () => {
  const { dom, messages, inject } = page();
  try {
    inject(true);
    inject(true);
    assert.deepEqual(messages, ['ready', 'active']);
    const doc = dom.window.document;
    const host = doc.createElement('div');
    host.className = 'settings';
    host.innerHTML = '<nav class="settings-nav"></nav><main class="settings-main"></main>';
    doc.body.append(host);
    await new Promise(resolve => setTimeout(resolve, 0));
    const nav = host.querySelectorAll<HTMLButtonElement>('.settings-nav button');
    assert.equal(nav.length, 1);
    nav[0]!.click();
    host.querySelector<HTMLButtonElement>('.yp-panel button')!.click();
    assert.equal(messages.at(-1), 'settings');
    dom.window.history.pushState({}, '', '/some-route');
    inject(true);
    assert.equal(host.querySelectorAll('.yp-panel').length, 1);
    inject(false);
    assert.equal(host.querySelector('.yp-panel'), null);
    assert.equal(host.querySelector('.settings-nav button'), null);
    assert.equal(messages.at(-1), 'inactive');
    inject(true);
    assert.equal(host.querySelectorAll('.yp-panel').length, 1);
  } finally { dom.window.close(); }
});

test('aucune injection désactivée, hors origine ou en sous-cadre', () => {
  for (const [url, enabled, framed] of [[origin, false, false], ['https://example.org', true, false],
    [origin, true, true]] as const) {
    const { dom, inject, messages } = page(url);
    try {
      if (framed) dom.reconfigure({ windowTop: new JSDOM().window });
      inject(enabled);
      assert.deepEqual(messages, []);
    } finally { dom.window.close(); }
  }
});


test('les cadres de connexion peuvent créer des documents inline sans accès au pont', () => {
  for (const url of ['about:blank', 'about:srcdoc', 'https://challenges.cloudflare.com/']) {
    assert.ok(allowChildFrame(url));
    assert.equal(isInternal(url, origin), false);
    assert.equal(readMessage(url, JSON.stringify({ v: 2, type: 'settings', channel }), origin, channel), null);
  }
  for (const url of ['about:config', 'about:blank.example', 'file:///example', 'javascript:void(0)', 'http://example.org']) {
    assert.equal(allowChildFrame(url), false);
  }
});
