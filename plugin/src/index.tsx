import { Button, Section, SettingRow, SettingsPage, SettingText, Switch } from '@yapmod/ui';
import { createSignal } from 'solid-js';
import { installNotifications } from './notifications';
import type { NoticeRequest } from '../../src/bridge/notifications';

interface MobileHost {
  appVersion: string;
  clientVersion: string;
  notice(request: NoticeRequest): void;
  setActive(active: boolean): void;
}

export default function mobilePlugin(api: typeof yapmod, host: MobileHost) {
  return {
    onLoad() {
      const notices = installNotifications(host.notice);
      api.onDispose(notices.dispose);
      const [busy, setBusy] = createSignal(false);
      const [unavailable, setUnavailable] = createSignal(false);
      async function action(work: () => Promise<unknown>) {
        if (busy()) return;
        setBusy(true);
        try { await work(); } catch { api.ui.showToast('Notification request failed. Try again.', 'error'); }
        finally { setBusy(false); }
      }
      api.settings.registerSection({
        id: 'mobile',
        label: 'Mobile',
        icon: 'settings',
        render: () => (
          <SettingsPage title="Mobile">
            <Section label="Notifications">
              <SettingRow label="Mobile notifications" hint={unavailable() && !notices.state() ? 'Device status unavailable.' :
                'Deliver alerts enabled in Yapin to your notification center.'}>
                <Switch aria-label="Mobile notifications" disabled={busy() || !notices.state()} checked={notices.state()?.enabled !== false}
                  onChange={value => void action(() => notices.update(value ? 'enable' : 'disable'))} />
              </SettingRow>
              {notices.state()?.enabled && notices.state()?.permission !== 'granted' &&
                <SettingRow label="Phone permission" hint={notices.state()?.permission === 'denied' ?
                  'Notifications are blocked in system settings.' : 'Allow this phone to show Yapin alerts.'}>
                  <Button size="small" disabled={busy()} onClick={() => void action(() => notices.state()?.permission === 'denied' ?
                    notices.settings() : notices.update('enable'))}>
                    {notices.state()?.permission === 'denied' ? 'Open system settings' : 'Allow notifications'}
                  </Button>
                </SettingRow>}
            </Section>
            <Section label="Software">
              <SettingText label="App version" value={host.appVersion} />
              <SettingText label="Yapmod client version" value={host.clientVersion} />
            </Section>
          </SettingsPage>
        ),
      });
      host.setActive(true);
      void notices.update('status').catch(() => setUnavailable(true));
    },
    onUnload() {
      host.setActive(false);
    },
  };
}
