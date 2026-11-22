import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { NoticeRequest, NoticeState } from '../bridge/notifications';

const key = 'yapmod.notifications.v1';
const channelId = 'yapin-messages';
const prefix = 'yapmod-live:';

Notifications.setNotificationHandler({ handleNotification: async notification => {
  const present = notification.request.identifier.startsWith(prefix);
  return { shouldShowBanner: present, shouldShowList: present, shouldPlaySound: present, shouldSetBadge: false };
} });

async function state(): Promise<NoticeState> {
  const enabled = (await AsyncStorage.getItem(key)) !== 'off';
  const permission = await Notifications.getPermissionsAsync();
  const blockedChannel = Platform.OS === 'android' &&
    (await Notifications.getNotificationChannelAsync(channelId))?.importance === Notifications.AndroidImportance.NONE;
  return { enabled, permission: blockedChannel ? 'denied' : permission.granted ? 'granted' :
    permission.canAskAgain ? 'default' : 'denied' };
}

async function ensureChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId,
    { name: 'Yapin messages', importance: Notifications.AndroidImportance.HIGH });
}

export function listenForTap(clicked: (id: string) => void) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const id = response.notification.request.identifier;
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER && id.startsWith(prefix)) clicked(id.slice(prefix.length));
  });
}

export function notificationSession() {
  let alive = true;
  let queue = Promise.resolve();
  let pending = 0;
  const recent: number[] = [];
  const owned = new Set<string>();
  async function perform(request: NoticeRequest) {
    if (!alive) throw new Error('Session closed');
    switch (request.op) {
      case 'status': return state();
      case 'settings': await Linking.openSettings(); return;
      case 'enable': {
        await ensureChannel();
        await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
        if (alive) await AsyncStorage.setItem(key, 'on');
        return state();
      }
      case 'disable': await AsyncStorage.setItem(key, 'off'); return state();
      case 'close':
        if (owned.delete(request.notice)) await Notifications.dismissNotificationAsync(prefix + request.notice);
        return;
      case 'show': {
        const now = Date.now();
        while (recent.length && now - recent[0]! >= 60_000) recent.shift();
        if (recent.length >= 20) throw new Error('Too many notifications');
        const current = await state();
        if (!alive || !current.enabled || current.permission !== 'granted') throw new Error('Disabled');
        await ensureChannel();
        if (!alive) throw new Error('Session closed');
        recent.push(now);
        await Notifications.scheduleNotificationAsync({ identifier: prefix + request.id,
          content: { title: request.title || 'Yapin', body: request.body },
          trigger: Platform.OS === 'android' ? { channelId } : null });
        if (owned.size >= 100) owned.delete(owned.values().next().value!);
        owned.add(request.id);
      }
    }
  }
  return { dispose() { alive = false; owned.clear(); }, run(request: NoticeRequest) {
    if (pending >= 32) return Promise.reject(new Error('Busy'));
    pending++;
    const result = queue.then(() => perform(request));
    queue = result.then(() => {}, () => {}).finally(() => { pending--; });
    return result;
  } };
}
