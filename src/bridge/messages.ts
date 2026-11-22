import { isInternal } from '../config/address';

export type BridgeMessage = {
  v: 2;
  channel: string;
  type: 'ready' | 'active' | 'inactive' | 'error' | 'settings';
};

export function readMessage(url: unknown, data: unknown, origin: string, channel: string): BridgeMessage | null {
  if (!isInternal(url, origin) || typeof data !== 'string' || data.length > 96) return null;
  try {
    const message = JSON.parse(data);
    if (!message || Object.keys(message).length !== 3 || message.v !== 2 || message.channel !== channel) return null;
    switch (message.type) {
      case 'ready':
      case 'active':
      case 'inactive':
      case 'error':
      case 'settings':
        return { v: 2, channel, type: message.type };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
