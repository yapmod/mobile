import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, Alert, AppState, BackHandler, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { readMessage } from '../bridge/messages';
import { readNotice } from '../bridge/notifications';
import { listenForTap, notificationSession } from '../notifications/native';
import { Action, colors, styles } from '../components/controls';
import { isInternal, webAddress } from '../config/address';
import { initialRecovery, recover, type Failure } from './recovery';
import { allowChildFrame } from './frameNavigation';
import { linkPreviewScript, readPreview } from '../injection/linkPreview';
import { layoutScript } from '../injection/layout';
import { bootstrapScript } from '../injection/bootstrap';

type Props = {
  address: URL; enabled: boolean;
};

export function YapinView(props: Props) {
  const [state, dispatch] = useReducer(recover, initialRecovery);
  useEffect(() => {
    if (!state.waitingForForeground) return;
    function resume() { dispatch({ type: 'foreground', now: Date.now() }); }
    const sub = AppState.addEventListener('change', status => { if (status === 'active') resume(); });
    // The app may have resumed between the native failure and this subscription.
    if (AppState.currentState === 'active') resume();
    return () => sub.remove();
  }, [state.waitingForForeground]);

  if (state.failure) {
    const detail = state.failure.kind === 'renderer' ? 'L’affichage de Yapin s’est interrompu.'
      : state.failure.kind === 'http' ? `Yapin a renvoyé une erreur HTTP ${state.failure.status}.`
      : 'Le chargement a échoué. Vérifiez votre connexion puis réessayez.';
    return <SafeAreaView style={styles.center}><Text style={styles.title}>Yapin est indisponible</Text>
      <Text style={styles.detail}>{detail}</Text>
      <Action title="Réessayer" onPress={() => dispatch({ type: 'retry' })} /></SafeAreaView>;
  }
  if (state.waitingForForeground) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return <YapinPage key={state.generation} {...props} onFailure={(failure, callback) => {
    const appState = AppState.currentState;
    console.warn('[Yapin WebView]', callback, appState, failure);
    dispatch({ type: 'failed', generation: state.generation, failure, active: appState === 'active', now: Date.now() });
  }} />;
}

function YapinPage({ address, enabled, onFailure }: Props & {
  onFailure: (failure: Failure, callback: string) => void;
}) {
  const ref = useRef<WebView<object>>(null);
  const back = useRef(false);
  const [loading, setLoading] = useState(true);
  const openingBrowser = useRef(false);
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
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!back.current) return false;
      ref.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  function external(raw: string) {
    const target = webAddress(raw);
    if (!target || openingBrowser.current) return;
    openingBrowser.current = true;
    void openBrowserAsync(target.href, { presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET })
      .catch(() => Alert.alert('Impossible d’ouvrir le navigateur.'))
      .finally(() => { openingBrowser.current = false; });
  }
  return <View style={styles.screen}>
    <WebView<object> ref={ref} source={source} style={styles.screen}
      // Yapin uses viewport-fit=cover and CSS safe-area insets for its controls.
      automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
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
        setLoading(true);
      }}
      onLoad={() => setLoading(false)}
      onError={({ nativeEvent }) => onFailure({ kind: 'load', code: nativeEvent.code }, 'onError')}
      onContentProcessDidTerminate={() => onFailure({ kind: 'renderer' }, 'onContentProcessDidTerminate')}
      onRenderProcessGone={() => onFailure({ kind: 'renderer' }, 'onRenderProcessGone')}
      onHttpError={({ nativeEvent }) => {
        if (isInternal(nativeEvent.url, address.origin) && nativeEvent.statusCode >= 400) {
          onFailure({ kind: 'http', status: nativeEvent.statusCode }, 'onHttpError');
        }
      }}
      injectedJavaScript={layoutScript(address.origin) + linkPreviewScript(address.origin, channel) + (enabled ? script : '')}
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
      }}
    />
    {loading && <ActivityIndicator color={colors.accent} accessibilityLabel="Chargement de Yapin"
      style={{ position: 'absolute', alignSelf: 'center', top: '48%' }} />}
  </View>;
}
