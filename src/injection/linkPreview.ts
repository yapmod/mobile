import { isInternal, webAddress } from '../config/address';

// Yapin calls window.open after its own external-link confirmation.
export function linkPreviewScript(origin: string, channel: string): string {
  return `(function () {
    if (window !== window.top || location.origin !== ${JSON.stringify(origin)}
        || window.__yapmodLinkPreviewInstalled) return;
    const original = window.open;
    window.open = function (raw, target) {
      let url;
      try { url = new URL(raw, document.baseURI); } catch {}
      if (url && url.protocol === 'https:' && !url.username && !url.password
          && url.origin !== location.origin && (!target || target.toLowerCase() === '_blank')
          && window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          v: 2, type: 'preview', channel: ${JSON.stringify(channel)}, url: url.href
        }));
        return null;
      }
      return original.apply(this, arguments);
    };
    window.__yapmodLinkPreviewInstalled = true;
  })(); true;`;
}

export function readPreview(source: string, data: string, origin: string, channel: string): URL | null {
  if (!isInternal(source, origin) || data.length > 32768) return null;
  try {
    const message = JSON.parse(data);
    if (message?.type !== 'preview' || message.v !== 2 || message.channel !== channel) return null;
    const url = webAddress(message.url);
    return url && url.origin !== origin ? url : null;
  } catch {
    return null;
  }
}
