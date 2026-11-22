import { Button, Section, SettingRow, SettingsPage, SettingText } from '@yapmod/ui';

interface MobileHost {
  appVersion: string;
  clientVersion: string;
  openSettings(): void;
  setActive(active: boolean): void;
}

export default function mobilePlugin(api: typeof yapmod, host: MobileHost) {
  return {
    onLoad() {
      api.settings.registerSection({
        id: 'mobile',
        label: 'Mobile',
        icon: 'settings',
        render: () => (
          <SettingsPage title="Mobile">
            <Section label="Software">
              <SettingText label="App version" value={host.appVersion} />
              <SettingText label="Yapmod client version" value={host.clientVersion} />
              <SettingRow label="Mobile modifications">
                <Button size="small" onClick={() => host.openSettings()}>Open settings</Button>
              </SettingRow>
            </Section>
          </SettingsPage>
        ),
      });
      host.setActive(true);
    },
    onUnload() {
      host.setActive(false);
    },
  };
}
