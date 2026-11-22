import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from './src/components/controls';
import { webAddress } from './src/config/address';
import { Settings } from './src/screens/Settings';
import { loadPreference, savePreference } from './src/storage/preferences';
import { YapinView } from './src/webview/YapinView';

const address = webAddress(Constants.expoConfig?.extra?.yapinUrl);
export default function App() {
  const [settings, open] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [page, restart] = useState(0);
  const [status, setStatus] = useState('En attente de la page');
  useEffect(() => {
    let live = true;
    loadPreference().then(value => { if (live) setEnabled(value); }).catch(() => {
      if (live) {
        setEnabled(false);
        Alert.alert('Préférence illisible', 'Yapin démarre avec les modifications désactivées.');
      }
    });
    return () => { live = false; };
  }, []);
  function change(value: boolean) {
    setEnabled(value);
    setStatus(value ? 'En attente de la page' : 'Désactivé');
    // A fresh document also recovers from a broken or partially started module.
    restart(n => n + 1);
    savePreference(value).catch(() => Alert.alert('Impossible d’enregistrer la préférence.'));
  }
  return <SafeAreaProvider><SafeAreaView style={styles.screen}
    onTouchStartCapture={event => {
      if (event.nativeEvent.touches.length >= 3) open(true);
    }} onAccessibilityEscape={() => open(true)}>
    <StatusBar barStyle="light-content" />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!address ? <View style={styles.center}><Text style={styles.title}>Adresse de Yapin à configurer</Text>
        <Text style={styles.detail}>Renseignez EXPO_PUBLIC_YAPIN_URL puis régénérez le build.</Text></View>
        : enabled === null ? <ActivityIndicator color={colors.accent} />
        : <YapinView key={page} address={address} enabled={enabled} covered={settings} onSettings={() => open(true)} onStatus={setStatus} />}
    </KeyboardAvoidingView>
    <Settings open={settings} enabled={enabled} status={address ? status : 'Adresse non configurée'}
      canReload={Boolean(address) && enabled !== null} onToggle={change}
      onClose={() => open(false)} onReload={() => { restart(n => n + 1); open(false); }} />
  </SafeAreaView></SafeAreaProvider>;
}
