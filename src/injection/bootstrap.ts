import release from '../../vendor/yapmod/client.json';
import mobilePlugin from '../../vendor/yapmod/mobile.json';
import manifest from '../../plugin/manifest.json';
import { version } from '../../package.json';

// Verify the entire release during preparation; omit only the relative devtools map at injection.
const clientScript = release.source.replace(/\n\/\/# sourceMappingURL=yapmod-client\.js\.map\s*$/, '');

export function bootstrapScript(origin: string, enabled: boolean, channel: string): string {
  return `(function () {
    if (window !== window.top || location.origin !== ${JSON.stringify(origin)}) return;
    const key = '__yapmodMobileV3';
    const send = type => window.ReactNativeWebView?.postMessage(JSON.stringify({
      v: 2, type, channel: ${JSON.stringify(channel)}
    }));
    const previous = window[key];
    if (!${JSON.stringify(enabled)}) {
      if (previous) {
        previous.client.dispose();
        delete window[key];
      }
      return;
    }
    if (previous?.client === window.YapmodClient && previous?.client?.state === 'ready') return;
    // The client installs its public handle on globalThis; keep its bundle variables private.
    let client;
    try {
      if (window.YapmodClient) throw new Error('A client already owns this document.');
      (function startClient() {
        ${clientScript}
      })();
      client = window.YapmodClient;
      if (client?.state !== 'ready' || typeof client.registerClientPlugin !== 'function') {
        throw new Error('Client registration API unavailable.');
      }
      send('ready');
      let active = false;
      const registered = client.registerClientPlugin({
        id: 'client:yapmod-mobile',
        manifest: ${JSON.stringify(manifest)},
        defaultEnabled: true,
        setup(yapmod) {
          const createPlugin = ${mobilePlugin}
          return createPlugin(yapmod, {
            appVersion: ${JSON.stringify(version)},
            clientVersion: client.version,
            notice: request => window.ReactNativeWebView?.postMessage(JSON.stringify({
              v: 2, type: 'notice', channel: ${JSON.stringify(channel)}, request
            })),
            setActive(value) {
              active = value;
              send(value ? 'active' : 'inactive');
            }
          });
        }
      });
      if (!registered) throw new Error('Mobile plugin registration failed.');
      window[key] = { client };
      if (!active) send('inactive');
    } catch {
      client?.dispose?.();
      send('error');
    }
  })(); true;`;
}
