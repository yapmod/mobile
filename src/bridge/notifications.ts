import { isInternal } from '../config/address';

export type NoticeCommand = { op: 'status' | 'enable' | 'disable' | 'settings' }
  | { op: 'show'; title: string; body: string } | { op: 'close'; notice: string };
export type NoticeRequest = NoticeCommand & { id: string };
export type NoticeState = { enabled: boolean; permission: NotificationPermission };
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

export function readNotice(url: unknown, raw: unknown, origin: string, channel: string): NoticeRequest | null {
  if (!isInternal(url, origin) || typeof raw !== 'string' || raw.length > 8192) return null;
  try {
    const message = JSON.parse(raw);
    if (message?.v !== 2 || message.channel !== channel || message.type !== 'notice' ||
        Object.keys(message).length !== 4) return null;
    const request = message.request;
    if (typeof request?.id !== 'string' || !uuid.test(request.id)) return null;
    const size = Object.keys(request).length;
    if (size === 2 && ['status', 'enable', 'disable', 'settings'].includes(request.op)) return request;
    if (size === 3 && request.op === 'close' && typeof request.notice === 'string' && uuid.test(request.notice)) return request;
    if (size === 4 && request.op === 'show' && typeof request.title === 'string' && request.title.length <= 128 &&
        typeof request.body === 'string' && request.body.length <= 1024) return request;
  } catch {}
  return null;
}
