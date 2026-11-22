import mobilePlugin from '../../vendor/yapmod/mobile.json';
import { version } from '../../package.json';

// The embedded script is a classic IIFE, scoped to this document and origin.
export function bootstrapScript(origin: string, enabled: boolean, channel: string): string {
  return `(function () {
    if (window !== window.top || location.origin !== ${JSON.stringify(origin)}) return;
    const key = '__yapmodMobileV2';
    const send = type => window.ReactNativeWebView?.postMessage(JSON.stringify({
      v: 2, type, channel: ${JSON.stringify(channel)}
    }));
    try {
      if (!${JSON.stringify(enabled)}) {
        if (window[key]) {
          window[key].dispose();
          delete window[key];
          send('inactive');
        }
        return;
      }
      if (window[key]) return;
      ${mobilePlugin}
      send('ready');
      const dispose = YapmodMobilePlugin.startMobile(${JSON.stringify(version)}, send);
      window[key] = { version: 2, dispose };
      send('active');
    } catch {
      send('error');
    }
  })(); true;`;
}
