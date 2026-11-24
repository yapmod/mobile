import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from './src/components/controls';
import { webAddress } from './src/config/address';
import { loadPreference, savePreference } from './src/storage/preferences';
import { YapinView } from './src/webview/YapinView';

const address = webAddress(Constants.expoConfig?.extra?.yapinUrl);
export default function App() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [page, restart] = useState(0);
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
    // A fresh document also recovers from a broken or partially started module.
    restart(n => n + 1);
    savePreference(value).catch(() => Alert.alert('Impossible d’enregistrer la préférence.'));
  }
  const dialogOpen = useRef(false);
  function showRecovery() {
    if (!address || enabled === null || dialogOpen.current) return;
    dialogOpen.current = true;
    const dismiss = () => { dialogOpen.current = false; };
    Alert.alert('Récupération de Yapin', enabled
      ? 'Si Yapin fonctionne mal, vous pouvez le relancer sans les modifications locales.'
      : 'Les modifications locales sont désactivées. Vous pouvez les réactiver en relançant Yapin.', [
      { text: 'Annuler', style: 'cancel', onPress: dismiss },
      { text: 'Recharger', onPress: () => { dismiss(); restart(n => n + 1); } },
      { text: enabled ? 'Désactiver et relancer' : 'Activer et relancer',
        onPress: () => { dismiss(); change(!enabled); } },
    ], { cancelable: true, onDismiss: dismiss });
  }
  return <SafeAreaProvider><View style={styles.screen}
    onTouchStartCapture={event => {
      if (event.nativeEvent.touches.length >= 3) showRecovery();
    }} onAccessibilityEscape={showRecovery}>
    <StatusBar barStyle="light-content" />
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!address ? <SafeAreaView style={styles.center}><Text style={styles.title}>Adresse de Yapin à configurer</Text>
        <Text style={styles.detail}>Renseignez EXPO_PUBLIC_YAPIN_URL puis régénérez le build.</Text></SafeAreaView>
        : enabled === null ? <SafeAreaView style={styles.center}><ActivityIndicator color={colors.accent} /></SafeAreaView>
        : <YapinView key={page} address={address} enabled={enabled} />}
    </KeyboardAvoidingView>
  </View></SafeAreaProvider>;
}
