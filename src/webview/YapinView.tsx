import { useEffect, useMemo, useRef, useState } from 'react';
import { isRunningInExpoGo } from 'expo';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, Alert, BackHandler, Linking, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { readMessage } from '../bridge/messages';
import { Action, colors, styles } from '../components/controls';
import { isInternal, webAddress } from '../config/address';
import { allowChildFrame } from './frameNavigation';
import { bootstrapScript } from '../injection/bootstrap';

type Props = {
  address: URL; enabled: boolean; covered: boolean; onSettings: () => void; onStatus: (text: string) => void;
};
const states = {
  ready: 'Bootstrap v2 démarré', active: 'Plugin Mobile actif',
  inactive: 'Désactivé', error: 'Échec du diagnostic',
};

export function YapinView({ address, enabled, covered, onSettings, onStatus }: Props) {
  const ref = useRef<WebView<object>>(null);
  const back = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const confirmed = useRef(false);
  const [channel] = useState(randomUUID);
  const source = useMemo(() => ({ uri: address.href }), [address.href]);
  const script = useMemo(() => bootstrapScript(address.origin, enabled, channel), [address.origin, enabled, channel]);

  useEffect(() => {
    if (covered) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!back.current || error) return false;
      ref.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [covered, error]);

  useEffect(() => {
    if (!enabled || loading || error) return;
    const timer = setTimeout(() => {
      if (!confirmed.current) onStatus('Aucune réponse du bootstrap');
    }, 4000);
    return () => clearTimeout(timer);
  }, [enabled, loading, error, onStatus]);

  function external(raw: string) {
    const target = webAddress(raw);
    if (!target) return;
    Alert.alert('Ouvrir le navigateur ?', target.host, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ouvrir', onPress: () => {
        Linking.openURL(target.href).catch(() => Alert.alert('Impossible d’ouvrir le navigateur.'));
      } },
    ]);
  }
  function failed() {
    setError(true);
    setLoading(false);
    onStatus('Page indisponible');
  }
  if (error) return <View style={styles.center}><Text style={styles.title}>Yapin est indisponible</Text>
    <Text style={styles.detail}>Vérifiez votre connexion puis réessayez.</Text>
    <Action title="Réessayer" onPress={() => { setError(false); setLoading(true); }} /></View>;
  return <View style={styles.screen}>
    <WebView<object> ref={ref} source={source} style={styles.screen}
      originWhitelist={['*']} mixedContentMode="never" allowFileAccess={false}
      allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
      domStorageEnabled incognito={false} thirdPartyCookiesEnabled={false}
      mediaCapturePermissionGrantType={isRunningInExpoGo() ? 'deny' : 'prompt'}
      allowsInlineMediaPlayback mediaPlaybackRequiresUserAction
      geolocationEnabled={false} setSupportMultipleWindows
      onShouldStartLoadWithRequest={req => {
        if (req.isTopFrame === false) return allowChildFrame(req.url);
        if (isInternal(req.url, address.origin)) return true;
        external(req.url);
        return false;
      }}
      onOpenWindow={({ nativeEvent: { targetUrl } }) => {
        if (isInternal(targetUrl, address.origin)) {
          ref.current?.injectJavaScript(
            `if (location.origin === ${JSON.stringify(address.origin)}) location.assign(${JSON.stringify(targetUrl)}); true;`,
          );
        } else external(targetUrl);
      }}
      onNavigationStateChange={state => { back.current = state.canGoBack; }}
      onLoadStart={() => {
        confirmed.current = false;
        setLoading(true);
        onStatus(enabled ? 'En attente du bootstrap' : states.inactive);
      }}
      onLoad={() => setLoading(false)}
      onError={failed} onContentProcessDidTerminate={failed} onRenderProcessGone={failed}
      onHttpError={({ nativeEvent }) => {
        if (isInternal(nativeEvent.url, address.origin) && nativeEvent.statusCode >= 400) failed();
      }}
      injectedJavaScript={enabled ? script : undefined}
      onMessage={enabled ? ({ nativeEvent }) => {
        const message = readMessage(nativeEvent.url, nativeEvent.data, address.origin, channel);
        if (!message) return;
        if (message.type === 'settings') { onSettings(); return; }
        confirmed.current = message.type !== 'ready';
        onStatus(states[message.type]);
      } : undefined}
    />
    {loading && <ActivityIndicator color={colors.accent} accessibilityLabel="Chargement de Yapin"
      style={{ position: 'absolute', alignSelf: 'center', top: '48%' }} />}
  </View>;
}
