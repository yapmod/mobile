<div align="center">
  <img src="docs/images/banner.svg" width="870" alt="Yapmod" />
  <h1>Yapmod Mobile</h1>
  <p>Open Yapin on iOS and Android with a bundled Yapmod plugin and settings built into the web client.</p>
  <p>
    <img src="https://img.shields.io/badge/Expo-SDK%2058-000020" alt="Expo SDK 58" />
    <img src="https://img.shields.io/badge/React%20Native-0.88-20232a" alt="React Native 0.88" />
  </p>
</div>

## Signing in

Open Yapmod Mobile in Expo Go and sign in through Yapin. The app opens the same sign-in address as Yapmod Desktop. Email and password sign-in has been confirmed on an iPhone 13 Pro Max running Expo Go 58.0.5, including Yapin’s bot check. Google sign-in, passkeys, and sign-in on Android still need device testing. [Yapin](https://www.yapin.gg/?auth=in)

Yapin manages the session in the WebView’s persistent storage. Reloading Yapin or turning modifications off preserves that storage. Whether a signed-in session survives a full app restart still needs verification.

## Mobile settings

Open **Settings → Yapmod → Mobile** in Yapin to see the app version and open the modification settings. From there you can check the plugin status, toggle modifications, or reload Yapin. Opening and closing settings keeps the current page. Changing the toggle reopens Yapin and saves your choice for the next launch.

If you need to reach the settings before signing in or while the plugin is disabled, touch the view with three fingers. The main screen leaves the available space to Yapin.

## Microphone and camera permissions

In Expo Go on iOS, the app declines web microphone and camera requests. On Android, Expo Go controls device permissions. Use a dedicated development build to test the project’s native capture prompts and origin checks. Voice and video calls, background audio, lock-screen behavior, and audio device switching still need testing on both platforms. [Device verification](VERIFICATION.md)

## Development

Install Git, npm, Node.js 24.15+ on the 24.x line or Node.js 26, and an Expo Go release compatible with SDK 58. Connect the phone and computer to the same network. On iPhone, sign in to the same Expo account in Expo Go and the CLI.

```sh
npm ci
cp .env.example .env
npx expo login
npm start
```

Scan the QR code printed by Metro to open the project on your phone. The default URL is `https://www.yapin.gg/?auth=in`. To use another public HTTPS client address, set `EXPO_PUBLIC_YAPIN_URL` in `.env` and restart Metro. An empty or invalid value displays the configuration screen. Keep credentials and session links out of this public variable.

| Command | Result |
| --- | --- |
| `npm run ios` / `npm run android` | Starts Metro in Expo Go mode and opens the selected local platform. |
| `npm run check` | Runs strict TypeScript checks, the tests, Expo dependency validation, and Expo Doctor. |
| `npx expo export --platform all` | Produces JavaScript bundles for iOS and Android. |
| `npx expo run:ios --device` / `npx expo run:android` | Compiles and installs a dedicated development build using the platform’s native toolchain. |

The dedicated build uses the versioned WebView patch in `patches/`. Expo Go uses its own WebView binary. The development bundle identifier and Android package name are both `dev.yapmod.mobile`. Change them in `app.config.js` before preparing a public release.

## Local plugin development

The mobile plugin registers as `client:yapmod-mobile`. Edit `plugin/mobile.js` to add a settings section through `api.settings.registerSection` in its `onLoad` hook. The bootstrap installs the bundled plugin once per top-level Yapin document after loading. The bridge checks the native event URL and a per-WebView channel before accepting a status message or a request to open settings.

The repository includes the compiled plugin in `vendor/yapmod/mobile.json`, so a fresh clone can run immediately after installing dependencies. After changing the plugin, check out the pinned Yapmod client revision, install that checkout’s build dependencies, and run the following commands from the mobile repository. [Pinned Yapmod client source](https://github.com/yapmod/client/tree/43f3a933a675201b914dcbff219524022494e27f)

```sh
node scripts/bundle-mobile.mjs /path/to/yapmod/client
npm run check
```

## Artwork and bundled licenses

The project uses the Yapmod Desktop banner and app icon. Expo Go displays the project artwork inside its host app and keeps its own icon on the phone’s home screen. The bundled client and Solid code carry their upstream licenses. [Desktop artwork](https://github.com/yapmod/desktop#license-and-artwork) · [Yapmod client license](vendor/yapmod/LICENSE) · [Solid license](vendor/yapmod/LICENSE.solid-js)

<p align="center">Yapmod Mobile is an independent Yapin community project.</p>
