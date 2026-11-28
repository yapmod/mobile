import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { fetch } from 'expo/fetch';
import { loadClientRelease, type ClientRelease } from './release';

const key = 'yapmod.client.v1';
let pending: Promise<ClientRelease> | undefined;

export function loadClient() {
  pending ??= loadClientRelease({
    fetch,
    sha256: source => digestStringAsync(CryptoDigestAlgorithm.SHA256, source),
    readCache: () => AsyncStorage.getItem(key),
    writeCache: value => AsyncStorage.setItem(key, value),
  }).finally(() => { pending = undefined; });
  return pending;
}
