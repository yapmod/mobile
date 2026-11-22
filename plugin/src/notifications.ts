import { createSignal } from 'solid-js';
import type { NoticeCommand, NoticeRequest, NoticeState } from '../../src/bridge/notifications';

export function installNotifications(send: (request: NoticeRequest) => void) {
  const [state, setState] = createSignal<NoticeState>();
  const previous = Object.getOwnPropertyDescriptor(window, 'Notification');
  const pending = new Map<string, (ok: boolean, value?: NoticeState) => void>();
  const notices = new Map<string, MobileNotification>();
  let alive = true;
  function call(command: NoticeCommand, id = crypto.randomUUID()): Promise<NoticeState | undefined> {
    if (!alive || pending.size >= 32) return Promise.reject(new Error('Notifications unavailable'));
    return new Promise((resolve, reject) => {
      const finish = (ok: boolean, value?: NoticeState) => {
        clearTimeout(timer);
        pending.delete(id);
        if (ok) resolve(value); else reject(new Error('Notification request failed'));
      };
      const timer = setTimeout(() => finish(false), 60_000);
      pending.set(id, finish);
      try { send({ ...command, id }); } catch { finish(false); }
    });
  }
  async function update(op: 'status' | 'enable' | 'disable') {
    const next = await call({ op });
    if (alive && next) setState(next);
    return MobileNotification.permission;
  }
  class MobileNotification extends EventTarget {
    readonly id = crypto.randomUUID();
    readonly body: string;
    readonly data: unknown;
    readonly tag: string;
    onclick: ((event: Event) => void) | null = null;
    onclose: ((event: Event) => void) | null = null;
    onshow: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    static get permission(): NotificationPermission {
      const current = state();
      return !current ? 'default' : current.enabled ? current.permission : 'denied';
    }
    static async requestPermission(callback?: NotificationPermissionCallback) {
      let permission = await update('status');
      if (state()?.enabled && permission === 'default') permission = await update('enable');
      callback?.(permission);
      return permission;
    }
    constructor(readonly title: string, options: NotificationOptions = {}) {
      super();
      this.body = String(options.body ?? '');
      this.data = options.data ?? null;
      this.tag = String(options.tag ?? '');
      for (const type of ['click', 'close', 'show', 'error'] as const)
        this.addEventListener(type, event => this[`on${type}`]?.(event));
      if (MobileNotification.permission !== 'granted') return;
      if (notices.size >= 100) notices.delete(notices.keys().next().value!);
      notices.set(this.id, this);
      void call({ op: 'show', title: String(title).slice(0, 128), body: this.body.slice(0, 1024) }, this.id)
        .then(() => { if (notices.has(this.id)) this.dispatchEvent(new Event('show')); },
          () => { if (notices.delete(this.id)) this.dispatchEvent(new Event('error')); });
    }
    close() {
      if (!notices.delete(this.id)) return;
      this.dispatchEvent(new Event('close'));
      void call({ op: 'close', notice: this.id }).catch(() => {});
    }
  }
  function receive(event: Event) {
    const detail = (event as CustomEvent).detail;
    if (detail?.refresh) void update('status').catch(() => setState(undefined));
    else if (detail?.clicked) {
      const notice = notices.get(detail.clicked);
      if (MobileNotification.permission === 'granted') notice?.dispatchEvent(new Event('click'));
      notice?.close();
    } else if (detail?.id) pending.get(detail.id)?.(detail.ok === true, detail.value);
  }
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: MobileNotification });
  window.addEventListener('yapmod:mobile-notice', receive);
  return { state, update, settings: () => call({ op: 'settings' }),
    dispose() {
      alive = false;
      window.removeEventListener('yapmod:mobile-notice', receive);
      notices.clear();
      for (const finish of pending.values()) finish(false);
      if (Object.getOwnPropertyDescriptor(window, 'Notification')?.value !== MobileNotification) return;
      if (previous) Object.defineProperty(window, 'Notification', previous);
      else Reflect.deleteProperty(window, 'Notification');
    } };
}
