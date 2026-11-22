// This entry is compiled for the Yapin document, independently of React Native.
import { createClient } from '@yapmod/core';
import { installSettings } from 'yapmod-source/features/settings/install';
import { registerClientPlugin, stopPlugin } from 'yapmod-source/features/plugins/runtime';

const id = 'client:yapmod-mobile';

export function startMobile(version, send) {
  const client = createClient();
  let loaded = false;
  try {
    installSettings(client, [{ label: 'Yapmod', sections: [] }]);
    client.onDispose(() => stopPlugin(id));
    registerClientPlugin({
      id,
      manifest: { name: 'Yapmod Mobile', author: 'Yapmod', description: 'Réglages du client mobile.' },
      defaultEnabled: true,
      setup(api) {
        return {
          onLoad() {
            api.settings.registerSection({
              id: 'mobile', label: 'Mobile', icon: 'settings',
              render() {
                const panel = document.createElement('div');
                const title = document.createElement('h2');
                title.textContent = 'Yapmod Mobile';
                const info = document.createElement('p');
                info.textContent = 'Version ' + version;
                const settings = document.createElement('button');
                settings.type = 'button';
                settings.textContent = 'Paramètres des modifications';
                settings.onclick = () => send('settings');
                panel.append(title, info, settings);
                return panel;
              },
            });
            loaded = true;
          },
        };
      },
    });
    if (!loaded) throw new Error('Mobile plugin did not start.');
    return () => client.dispose();
  } catch (error) {
    client.dispose();
    throw error;
  }
}
