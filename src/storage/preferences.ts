import AsyncStorage from '@react-native-async-storage/async-storage';

const key = 'yapmod.modifications.v1';

export async function loadPreference() {
  const value = await AsyncStorage.getItem(key);
  return value === null || value === 'on';
}

// Serialize rapid toggles so the last choice survives a relaunch.
let pending = Promise.resolve();
export function savePreference(enabled: boolean) {
  pending = pending.catch(() => {}).then(() => AsyncStorage.setItem(key, enabled ? 'on' : 'off'));
  return pending;
}
