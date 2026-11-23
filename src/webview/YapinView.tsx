import { useEffect, useMemo, useRef, useState } from 'react';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, Alert, AppState, BackHandler, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { tag as clientTag } from '../../vendor/yapmod/client.json';
import { readMessage } from '../bridge/messages';
import { readNotice } from '../bridge/notifications';
import { listenForTap, notificationSession } from '../notifications/native';
import { Action, colors, styles } from '../components/controls';
import { isInternal, webAddress } from '../config/address';
import { allowChildFrame } from './frameNavigation';
import { linkPreviewScript, readPreview } from '../injection/linkPreview';
import { bootstrapScript } from '../injection/bootstrap';

type Props = {
  address: URL; enabled: boolean; covered: boolean; onSettings: () => void; onStatus: (text: string) => void;
};
const states = {
  ready: 'Bootstrap v2 démarré', active: `Yapmod client ${clientTag} · Mobile plugin active`,
  inactive: 'Désactivé', error: 'Échec du diagnostic',
};

export function YapinView({ address, enabled, covered, onSettings, onStatus }: Props) {
  const ref = useRef<WebView<object>>(null);
  const back = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const openingBrowser = useRef(false);
  const confirmed = useRef(false);
  const [channel] = useState(randomUUID);
  const source = useMemo(() => ({ uri: address.href }), [address.href]);
  const notices = useRef<ReturnType<typeof notificationSession> | null>(null);
  function resetNotices() {
    notices.current?.dispose();
    notices.current = null;
  }
  const emit = useMemo(() => (detail: object) => {
    if (notices.current) ref.current?.injectJavaScript(
      `if (location.origin === ${JSON.stringify(address.origin)}) window.dispatchEvent(new CustomEvent('yapmod:mobile-notice', {detail:${JSON.stringify(detail)}})); true;`,
    );
  }, [address.origin]);
  useEffect(() => {
    if (!enabled) return;
    const taps = listenForTap(id => emit({ clicked: id }));
    const focus = AppState.addEventListener('change', state => { if (state === 'active') emit({ refresh: true }); });
    return () => { resetNotices(); taps.remove(); focus.remove(); };
  }, [enabled, emit]);
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
    if (!target || openingBrowser.current) return;
    openingBrowser.current = true;
    void openBrowserAsync(target.href, { presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET })
      .catch(() => Alert.alert('Impossible d’ouvrir le navigateur.'))
      .finally(() => { openingBrowser.current = false; });
  }
  function failed() {
    resetNotices();
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
      mediaCapturePermissionGrantType="deny"
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
        resetNotices();
        confirmed.current = false;
        setLoading(true);
        onStatus(enabled ? 'En attente du bootstrap' : states.inactive);
      }}
      onLoad={() => setLoading(false)}
      onError={failed} onContentProcessDidTerminate={failed} onRenderProcessGone={failed}
      onHttpError={({ nativeEvent }) => {
        if (isInternal(nativeEvent.url, address.origin) && nativeEvent.statusCode >= 400) failed();
      }}
      injectedJavaScript={linkPreviewScript(address.origin, channel) + (enabled ? script : '')}
      onMessage={({ nativeEvent }) => {
        const preview = readPreview(nativeEvent.url, nativeEvent.data, address.origin, channel);
        if (preview) { external(preview.href); return; }
        if (!enabled) return;
        const message = readMessage(nativeEvent.url, nativeEvent.data, address.origin, channel);
        if (!message) {
          const session = notices.current;
          const request = session && readNotice(nativeEvent.url, nativeEvent.data, address.origin, channel);
          if (request) void session.run(request).then(value => {
            if (session === notices.current) emit({ id: request.id, ok: true, value });
          }, () => { if (session === notices.current) emit({ id: request.id, ok: false }); });
          return;
        }
        if (message.type === 'active') notices.current ??= notificationSession();
        if (['inactive', 'error', 'ready'].includes(message.type)) resetNotices();
        if (message.type === 'settings') { onSettings(); return; }
        confirmed.current = message.type !== 'ready';
        onStatus(states[message.type]);
      }}
    />
    {loading && <ActivityIndicator color={colors.accent} accessibilityLabel="Chargement de Yapin"
      style={{ position: 'absolute', alignSelf: 'center', top: '48%' }} />}
  </View>;
}
