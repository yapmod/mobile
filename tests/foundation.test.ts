import { createHash } from 'node:crypto';
import release from '../vendor/yapmod/client.json';
import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { isInternal, webAddress } from '../src/config/address';
import { readMessage } from '../src/bridge/messages';
import { readNotice, type NoticeRequest } from '../src/bridge/notifications';
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
  dom.window.matchMedia = (media: string) => Object.assign(new dom.window.EventTarget(), {
    media, matches: false, onchange: null, addListener() {}, removeListener() {},
  });
  const messages: string[] = [];
  const requests: NoticeRequest[] = [];
  dom.window.ReactNativeWebView = { postMessage(raw: string) {
    const message = readMessage(url, raw, origin, channel);
    if (message) messages.push(message.type);
    const request = readNotice(url, raw, origin, channel);
    if (request) requests.push(request);
  } };
  return { dom, messages, requests, inject(enabled: boolean) {
    dom.window.eval(bootstrapScript(origin, enabled, channel));
  } };
}

test('le plugin local monte une section, ouvre les paramètres et nettoie son intégration', async () => {
  const { dom, messages, requests, inject } = page();
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
    const mobileNav = '.settings-nav [data-yp-section="plugin:client:yapmod-mobile:mobile"]';
    const nav = host.querySelectorAll<HTMLButtonElement>(mobileNav);
    assert.equal(nav.length, 1);
    assert.ok(host.querySelector('.settings-nav [data-yp-section="plugins"]'));
    assert.equal('v' + dom.window.YapmodClient.version, release.tag);
    nav[0]!.click();
    const panel = host.querySelector<HTMLElement>('.yp-panel[data-yp-current]')!;
    assert.ok(panel.textContent.includes(dom.window.YapmodClient.version));
    assert.deepEqual(requests.map(request => request.op), ['status']);
    const reply = async (enabled: boolean, permission: NotificationPermission) => {
      dom.window.dispatchEvent(new dom.window.CustomEvent('yapmod:mobile-notice', {
        detail: { id: requests.at(-1)!.id, ok: true, value: { enabled, permission } },
      }));
      await new Promise(resolve => setTimeout(resolve, 0));
    };
    await reply(true, 'default');
    const button = (label: string) => Array.from(panel.querySelectorAll('button')).find(item => item.textContent === label);
    assert.equal(button('Send test notification'), undefined);
    button('Allow notifications')!.click();
    assert.equal(requests.at(-1)?.op, 'enable');
    await reply(true, 'denied');
    assert.ok(button('Open system settings'));
    Array.from(panel.querySelectorAll('button')).find(button => button.textContent === 'Open settings')!.click();
    assert.equal(messages.at(-1), 'settings');
    dom.window.history.pushState({}, '', '/some-route');
    inject(true);
    assert.equal(host.querySelectorAll(mobileNav).length, 1);
    inject(false);
    assert.equal(dom.window.YapmodClient, undefined);
    assert.equal(host.querySelector('.yp-panel'), null);
    assert.equal(host.querySelector('.settings-nav button'), null);
    assert.equal(messages.at(-1), 'inactive');
    inject(true);
    assert.equal(host.querySelectorAll(mobileNav).length, 1);
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


test('the bundled client matches the release digest', () => {
  assert.equal('sha256:' + createHash('sha256').update(release.source).digest('hex'), release.digest);
});

test('notification commands require origin, channel, bounded content and exact fields', () => {
  const request = { id: channel, op: 'show', title: 'Yapin', body: 'Hello' };
  const pack = (value: object) => JSON.stringify({ type: 'notice', v: 2, channel, request: value });
  assert.deepEqual(readNotice(origin, pack(request), origin, channel), request);
  assert.equal(readNotice('https://elsewhere.test', pack(request), origin, channel), null);
  assert.equal(readNotice(origin, pack(request), origin, 'wrong'), null);
  for (const invalid of [{ ...request, body: 'x'.repeat(1025) }, { ...request, url: origin },
    { ...request, op: 'eval' }, { ...request, id: '' }, { id: channel, op: 'close', notice: 2 }])
    assert.equal(readNotice(origin, pack(invalid), origin, channel), null);
});

test('live notification forwards show, tap and close once and restores the previous API', async () => {
  const { dom, requests, inject } = page();
  const original = dom.window.Notification;
  const emit = (detail: object) => dom.window.dispatchEvent(new dom.window.CustomEvent('yapmod:mobile-notice', { detail }));
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  try {
    inject(true);
    assert.equal(requests[0]?.op, 'status');
    new dom.window.Notification('Before opt-in');
    assert.equal(requests.length, 1);
    emit({ id: requests[0]!.id, ok: true, value: { enabled: true, permission: 'granted' } });
    await tick();
    const notice = new dom.window.Notification('Message', { body: 'Hello' });
    const events: string[] = [];
    for (const type of ['show', 'click', 'close']) notice.addEventListener(type, () => events.push(type));
    const show = requests.at(-1)!;
    assert.deepEqual(show, { id: show.id, op: 'show', title: 'Message', body: 'Hello' });
    emit({ id: show.id, ok: true });
    await tick();
    emit({ clicked: show.id });
    emit({ clicked: show.id });
    assert.deepEqual(events, ['show', 'click', 'close']);
    assert.equal(requests.at(-1)?.op, 'close');
    inject(false);
    assert.equal(dom.window.Notification, original);
  } finally { dom.window.close(); }
});
